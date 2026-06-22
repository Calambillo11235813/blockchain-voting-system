import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { ElectoresService } from '../electores/electores.service';
import { Elector } from '../electores/entities/elector.entity';
import { ArchivosBiometriaValidados } from './dto/validar-identidad-archivos.dto';
import { FaceMatchService } from './services/face-match.service';
import { OcrService } from './services/ocr.service';
import { ConfiguracionService } from '../elecciones/services/configuracion.service';

export interface ResultadoValidacionIdentidad {
  verificado: boolean;
  datosElector: Elector;
}

@Injectable()
export class BiometriaService {
  private readonly logger = new Logger(BiometriaService.name);
  private readonly debugBiometria =
    String(process.env.BIOMETRIA_DEBUG || '').toLowerCase() === 'true' ||
    process.env.NODE_ENV !== 'production';

  constructor(
    private readonly electoresService: ElectoresService,
    private readonly ocrService: OcrService,
    private readonly faceMatchService: FaceMatchService,
    private readonly configuracionService: ConfiguracionService,
  ) { }

  /**
   * Orquesta la validacion biometrica multifactor (HU-005).
   *
   * Paso 1 (OCR): extrae CI y datos desde las imagenes del carnet.
   * Paso 2 (Match de Datos): verifica que exista en el padron y que nombres coincidan.
   * Paso 3 (Face Match): compara selfie con la foto del carnet.
   */
  async validarIdentidad(archivos: ArchivosBiometriaValidados, reqUser?: any): Promise<ResultadoValidacionIdentidad> {
    const traceId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      const bypassOcrMaestro =
        (await this.configuracionService.obtenerValor('BYPASS_BIOMETRIA_OCR')) === true ||
        String(process.env.BYPASS_BIOMETRIA_OCR || '').toLowerCase() === 'true';

      const bypassBiometriaMaestro =
        (await this.configuracionService.obtenerValor('BYPASS_BIOMETRIA_FACE_MATCH')) === true ||
        String(process.env.BYPASS_BIOMETRIA_FACE_MATCH || '').toLowerCase() === 'true';

      this.logDebug(traceId, 'Inicio de verificacion biometrica', {
        frontal: this.resumenArchivo(archivos.frontal),
        trasera: this.resumenArchivo(archivos.trasera),
        selfie: this.resumenArchivo(archivos.selfie),
        bypassOcr: bypassOcrMaestro,
      });

      let datosCarnet = { ci: '', nombres: '', apellidos: '', candidatosCi: [] as string[] };
      let ciSeleccionado = '';
      let elector: Elector | null = null;

      if (bypassOcrMaestro && reqUser) {
        this.logDebug(traceId, 'Bypass Mastro de OCR activado. Omitiendo extracción con Gemini/Tesseract y validación de nombres.');
        ciSeleccionado = reqUser.ci;
        elector = reqUser as Elector;
      } else {
        datosCarnet = await this.ocrService.extraerDatosDesdeCarnet(archivos, traceId);
        this.logDebug(traceId, 'Datos extraidos desde OCR', {
          ci: datosCarnet.ci,
          candidatosCi: datosCarnet.candidatosCi,
          nombres: datosCarnet.nombres,
          apellidos: datosCarnet.apellidos,
        });

        const candidatosCi = this.ocrService.normalizarCandidatosCi([
          datosCarnet.ci,
          ...(datosCarnet.candidatosCi || []),
        ]);

        this.logDebug(traceId, 'Candidatos CI antes de buscar en padron', {
          candidatosCi,
        });

        ciSeleccionado = datosCarnet.ci;
        for (const candidato of candidatosCi) {
          const candidatoNormalizado = String(candidato || '').trim();
          if (!candidatoNormalizado || this.ocrService.pareceFecha(candidatoNormalizado)) {
            continue;
          }

          const encontrado = await this.electoresService.buscarPorCi(candidatoNormalizado);
          if (encontrado) {
            ciSeleccionado = candidatoNormalizado;
            elector = encontrado;
            break;
          }
        }

        if (!elector) {
          throw new BadRequestException('El numero de carnet no existe en el padron.');
        }

        this.logDebug(traceId, 'CI seleccionado por padron', {
          ciSeleccionado,
        });

        const coincideNombres = this.camposCoincidenConTolerancia(elector.nombre, datosCarnet.nombres);
        const coincideApellidos = this.camposCoincidenConTolerancia(elector.apellido, datosCarnet.apellidos);

        if (!coincideNombres || !coincideApellidos) {
          throw new BadRequestException('Los datos del carnet no coinciden con el padron.');
        }
      }

      if (bypassBiometriaMaestro) {
        this.logDebug(traceId, 'Bypass Maestro de verificacion facial activado. Saltando comparacion 1:1.');
      } else {
        const verificacionFacialExitosa = await this.faceMatchService.verificarRostro(
          archivos.frontal.path,
          archivos.selfie.path,
        );
        if (!verificacionFacialExitosa) {
          throw new BadRequestException('La verificacion facial no coincide.');
        }
      }

      return {
        verificado: true,
        datosElector: elector!,
      };
    } catch (error: unknown) {
      this.logDebug(traceId, 'Error en verificacion biometrica', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await this.eliminarArchivosTemporales(archivos);
    }
  }

  private resumenArchivo(archivo: Express.Multer.File): Record<string, unknown> {
    return {
      originalname: archivo.originalname,
      mimetype: archivo.mimetype,
      size: archivo.size,
      path: archivo.path,
    };
  }

  private logDebug(traceId: string, message: string, context?: Record<string, unknown>): void {
    if (!this.debugBiometria) {
      return;
    }

    if (context) {
      this.logger.log(`[${traceId}] ${message} | ${JSON.stringify(context)}`);
      return;
    }

    this.logger.log(`[${traceId}] ${message}`);
  }

  private async eliminarArchivosTemporales(archivos: ArchivosBiometriaValidados): Promise<void> {
    const rutas = [archivos.frontal.path, archivos.trasera.path, archivos.selfie.path]
      .filter((ruta): ruta is string => typeof ruta === 'string' && ruta.length > 0);

    await Promise.all(
      rutas.map(async ruta => {
        try {
          await unlink(ruta);
        } catch (_error: unknown) {
          // Silencioso: el archivo puede no existir si ya fue eliminado.
        }
      }),
    );
  }

  private camposCoincidenConTolerancia(valorPadron: string, valorOcr: string): boolean {
    const a = this.normalizarTextoParaComparacion(valorPadron);
    const b = this.normalizarTextoParaComparacion(valorOcr);
    if (!a || !b) {
      return false;
    }

    if (a === b) {
      return true;
    }

    return this.similitudLevenshtein(a, b) >= 0.85;
  }

  private normalizarTextoParaComparacion(valor: string): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private similitudLevenshtein(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
      return 1;
    }
    const dist = this.distanciaLevenshtein(a, b);
    return 1 - dist / maxLen;
  }

  private distanciaLevenshtein(a: string, b: string): number {
    if (a === b) {
      return 0;
    }

    const aLen = a.length;
    const bLen = b.length;
    if (aLen === 0) {
      return bLen;
    }
    if (bLen === 0) {
      return aLen;
    }

    const prev = new Array<number>(bLen + 1);
    const curr = new Array<number>(bLen + 1);
    for (let j = 0; j <= bLen; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= aLen; i++) {
      curr[0] = i;
      const aChar = a.charCodeAt(i - 1);

      for (let j = 1; j <= bLen; j++) {
        const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost,
        );
      }

      for (let j = 0; j <= bLen; j++) {
        prev[j] = curr[j];
      }
    }

    return prev[bLen];
  }
}
