import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { unlink } from 'fs/promises';
import { TextDecoder, TextEncoder } from 'util';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { EstudiantesService } from '../estudiantes/estudiantes.service';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { ArchivosBiometriaValidados } from './dto/validar-identidad-archivos.dto';

interface ResultadoOcrCarnet {
  ci: string;
  nombres: string;
  apellidos: string;
  candidatosCi: string[];
}

export interface ResultadoValidacionIdentidad {
  verificado: boolean;
  datosEstudiante: Estudiante;
}

@Injectable()
export class BiometriaService {
  private readonly logger = new Logger(BiometriaService.name);
  private readonly debugBiometria =
    String(process.env.BIOMETRIA_DEBUG || '').toLowerCase() === 'true' ||
    process.env.NODE_ENV !== 'production';
  // Modos soportados: 'local' | 'gemini' | 'local_then_gemini' | 'gemini_then_local'
  private readonly ocrProvider = String(process.env.BIOMETRIA_OCR_PROVIDER || 'gemini_then_local').toLowerCase();
  private readonly geminiApiKey = String(process.env.GEMINI_API_KEY || '');
  private readonly geminiModel = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
  private readonly geminiBaseUrl = String(process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta');
  private readonly geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
  private readonly permitirBypassFaceMatchPorRuntime =
    String(process.env.BIOMETRIA_FACE_MATCH_ALLOW_RUNTIME_BYPASS || '').toLowerCase() === 'true' ||
    process.env.NODE_ENV !== 'production';

  // Interruptor maestro solicitado por el usuario para deshabilitar temporalmente la biometría
  private readonly bypassBiometriaMaestro =
    String(process.env.BYPASS_BIOMETRIA_FACE_MATCH || '').toLowerCase() === 'true';

  constructor(
    private readonly estudiantesService: EstudiantesService,
  ) { }

  /**
   * Orquesta la validacion biometrica multifactor (HU-005).
   *
   * Paso 1 (OCR): extrae CI y datos desde las imagenes del carnet.
   * Paso 2 (Match de Datos): verifica que exista en el padron y que nombres coincidan.
   * Paso 3 (Face Match): compara selfie con la foto del carnet.
   *
   * @param archivos Imagenes (frontal, trasera, selfie) ya validadas.
   * @returns Resultado de la validacion.
   * @throws BadRequestException si los datos no coinciden con el padron.
   * @throws NotImplementedException mientras OCR/Face Match no esten implementados.
   */
  async validarIdentidad(archivos: ArchivosBiometriaValidados): Promise<ResultadoValidacionIdentidad> {
    const traceId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    try {
      this.logDebug(traceId, 'Inicio de verificacion biometrica', {
        frontal: this.resumenArchivo(archivos.frontal),
        trasera: this.resumenArchivo(archivos.trasera),
        selfie: this.resumenArchivo(archivos.selfie),
      });

      const datosCarnet = await this.extraerDatosDesdeCarnet(archivos, traceId);
      this.logDebug(traceId, 'Datos extraidos desde OCR', {
        ci: datosCarnet.ci,
        candidatosCi: datosCarnet.candidatosCi,
        nombres: datosCarnet.nombres,
        apellidos: datosCarnet.apellidos,
      });

      const candidatosCi = this.normalizarCandidatosCi([
        datosCarnet.ci,
        ...(datosCarnet.candidatosCi || []),
      ]);

      this.logDebug(traceId, 'Candidatos CI antes de buscar en padron', {
        candidatosCi,
      });

      let ciSeleccionado = datosCarnet.ci;
      let estudiante: Estudiante | null = null;
      for (const candidato of candidatosCi) {
        const candidatoNormalizado = String(candidato || '').trim();
        if (!candidatoNormalizado || this.pareceFecha(candidatoNormalizado)) {
          continue;
        }

        const encontrado = await this.estudiantesService.buscarEstudiantePorCi(candidatoNormalizado);
        if (encontrado) {
          ciSeleccionado = candidatoNormalizado;
          estudiante = encontrado;
          break;
        }
      }

      if (!estudiante) {
        throw new BadRequestException('El numero de carnet no existe en el padron.');
      }

      this.logDebug(traceId, 'CI seleccionado por padron', {
        ciSeleccionado,
      });

      const coincideNombres = this.camposCoincidenConTolerancia(estudiante.nombres, datosCarnet.nombres);
      const coincideApellidos = this.camposCoincidenConTolerancia(estudiante.apellidos, datosCarnet.apellidos);

      if (!coincideNombres || !coincideApellidos) {
        throw new BadRequestException('Los datos del carnet no coinciden con el padron.');
      }

      if (this.bypassBiometriaMaestro) {
        this.logDebug(traceId, 'Bypass Maestro de verificacion facial activado. Saltando comparacion 1:1.');
      } else {
        const verificacionFacialExitosa = await this.verificarRostro(archivos.frontal.path, archivos.selfie.path);
        if (!verificacionFacialExitosa) {
          throw new BadRequestException('La verificacion facial no coincide.');
        }
      }

      return {
        verificado: true,
        datosEstudiante: estudiante,
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

  /**
   * Extrae CI y datos del estudiante desde las imagenes del carnet.
   * @param archivos Archivos recibidos en la verificacion.
   * @returns Datos extraidos mediante OCR.
   * @throws NotImplementedException por ahora.
   */
  private async extraerDatosDesdeCarnet(
    _archivos: ArchivosBiometriaValidados,
    traceId: string,
  ): Promise<ResultadoOcrCarnet> {
    const rutaImagen = _archivos.frontal.path;
    let textoExtraido = '';
    let datos: ResultadoOcrCarnet = { ci: '', nombres: '', apellidos: '', candidatosCi: [] };

    // ── MODO: gemini_then_local ──────────────────────────────────────────────
    // Gemini primero (rápido ~2s). Si falla o devuelve datos incompletos,
    // se activa Tesseract como respaldo offline.
    if (this.ocrProvider === 'gemini_then_local') {
      this.logDebug(traceId, 'OCR: intentando Gemini primero (gemini_then_local)');
      const datosGemini = await this.extraerDatosConGemini(rutaImagen, traceId);
      const geminiCompleto = Boolean(datosGemini?.ci && datosGemini?.nombres && datosGemini?.apellidos);

      if (geminiCompleto && datosGemini) {
        this.logDebug(traceId, 'OCR: Gemini retorno datos completos. Tesseract omitido.');
        return datosGemini;
      }

      // Gemini incompleto o fallo → activar Tesseract como respaldo
      this.logDebug(traceId, 'OCR: Gemini incompleto o fallo. Activando Tesseract como respaldo.');
      textoExtraido = await this.ejecutarOcrSobreImagen(rutaImagen, traceId);
      this.logDebug(traceId, 'Texto OCR Tesseract (resumen)', {
        totalCaracteres: textoExtraido.length,
        muestra: textoExtraido.replace(/\s+/g, ' ').trim().slice(0, 280),
      });
      const datosLocal = this.extraerDatosDesdeTextoOcr(textoExtraido);

      // Fusionar lo que Gemini pudo extraer con lo de Tesseract
      datos = {
        ci: datosGemini?.ci || datosLocal.ci,
        nombres: datosGemini?.nombres || datosLocal.nombres,
        apellidos: datosGemini?.apellidos || datosLocal.apellidos,
        candidatosCi: this.normalizarCandidatosCi([
          ...(datosGemini?.candidatosCi || []),
          ...(datosLocal.candidatosCi || []),
        ]),
      };
    }

    // ── MODO: gemini (solo Gemini, sin fallback) ─────────────────────────────
    else if (this.ocrProvider === 'gemini') {
      this.logDebug(traceId, 'OCR: solo Gemini');
      const datosGemini = await this.extraerDatosConGemini(rutaImagen, traceId);
      if (datosGemini) {
        datos = datosGemini;
      }
    }

    // ── MODO: local_then_gemini (Tesseract primero, Gemini de respaldo) ──────
    else if (this.ocrProvider === 'local_then_gemini') {
      this.logDebug(traceId, 'OCR: Tesseract primero, Gemini de respaldo');
      textoExtraido = await this.ejecutarOcrSobreImagen(rutaImagen, traceId);
      const datosLocal = this.extraerDatosDesdeTextoOcr(textoExtraido);
      const localCompleto = Boolean(datosLocal.ci && datosLocal.nombres && datosLocal.apellidos);

      if (!localCompleto) {
        const datosGemini = await this.extraerDatosConGemini(rutaImagen, traceId);
        if (datosGemini) {
          datos = {
            ci: datosLocal.ci || datosGemini.ci,
            nombres: datosLocal.nombres || datosGemini.nombres,
            apellidos: datosLocal.apellidos || datosGemini.apellidos,
            candidatosCi: this.normalizarCandidatosCi([
              ...(datosLocal.candidatosCi || []),
              ...(datosGemini.candidatosCi || []),
            ]),
          };
        } else {
          datos = datosLocal;
        }
      } else {
        datos = datosLocal;
      }
    }

    // ── MODO: local (solo Tesseract, sin Gemini) ─────────────────────────────
    else {
      this.logDebug(traceId, 'OCR: solo Tesseract (local)');
      textoExtraido = await this.ejecutarOcrSobreImagen(rutaImagen, traceId);
      const datosLocal = this.extraerDatosDesdeTextoOcr(textoExtraido);
      datos = datosLocal;
    }

    if (!datos.candidatosCi || datos.candidatosCi.length === 0) {
      datos.candidatosCi = this.normalizarCandidatosCi([
        datos.ci,
        ...this.extraerCandidatosCiDesdeTexto(textoExtraido),
      ]);
    }

    if (!datos.ci) {
      throw new BadRequestException('No se pudo leer el numero de carnet desde la imagen frontal.');
    }
    if (!datos.nombres || !datos.apellidos) {
      throw new BadRequestException('No se pudo leer nombres y apellidos desde la imagen frontal.');
    }

    return datos;
  }

  /**
   * Ejecuta OCR con Tesseract.js sobre una imagen.
   * @param rutaImagen Ruta local del archivo de imagen.
   * @returns Texto extraido.
   * @throws BadRequestException si ocurre un error al procesar OCR.
   */
  private async ejecutarOcrSobreImagen(rutaImagen: string, traceId: string): Promise<string> {
    const variantes = await this.generarVariantesOcr(rutaImagen);
    const idiomas: ReadonlyArray<string> = ['spa', 'eng'];
    const bloques: string[] = [];

    for (const variante of variantes) {
      for (const idioma of idiomas) {
        const textoGeneral = await this.intentarOcrConIdioma(variante.buffer, idioma, {
          traceId,
          variante: variante.nombre,
          soloNumeros: false,
        });
        if (textoGeneral) {
          bloques.push(textoGeneral);
        }

        if (variante.priorizarSoloNumeros) {
          const textoNumeros = await this.intentarOcrConIdioma(variante.buffer, idioma, {
            traceId,
            variante: `${variante.nombre}-digits`,
            soloNumeros: true,
          });
          if (textoNumeros) {
            bloques.push(textoNumeros);
          }
        }
      }
    }

    const unicos = Array.from(
      new Set(
        bloques
          .map(item => item.trim())
          .filter(item => item.length > 0)
      )
    );

    this.logDebug(traceId, 'Variantes OCR procesadas', {
      totalVariantes: variantes.length,
      totalBloquesTexto: unicos.length,
    });

    return unicos.join('\n');
  }

  private async generarVariantesOcr(
    rutaImagen: string,
  ): Promise<Array<{ nombre: string; buffer: Buffer; priorizarSoloNumeros: boolean }>> {
    const variantes: Array<{ nombre: string; buffer: Buffer; priorizarSoloNumeros: boolean }> = [];

    const original = await sharp(rutaImagen)
      .rotate()
      .jpeg({ quality: 95 })
      .toBuffer();

    variantes.push({
      nombre: 'original',
      buffer: original,
      priorizarSoloNumeros: false,
    });

    const mejorada = await sharp(rutaImagen)
      .rotate()
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.1 })
      .modulate({ brightness: 1.06, saturation: 0 })
      .jpeg({ quality: 95 })
      .toBuffer();

    variantes.push({
      nombre: 'grayscale-normalize-sharpen',
      buffer: mejorada,
      priorizarSoloNumeros: false,
    });

    const altoContraste = await sharp(rutaImagen)
      .rotate()
      .grayscale()
      .normalize()
      .linear(1.35, -16)
      .threshold(155)
      .jpeg({ quality: 95 })
      .toBuffer();

    variantes.push({
      nombre: 'high-contrast-threshold',
      buffer: altoContraste,
      priorizarSoloNumeros: true,
    });

    const metadata = await sharp(rutaImagen).rotate().metadata();
    if (metadata.width && metadata.height && metadata.width > 220 && metadata.height > 120) {
      const regionesCi = [
        { nombre: 'ci-region-a', x: 0.48, y: 0.03, w: 0.50, h: 0.42 },
        { nombre: 'ci-region-b', x: 0.58, y: 0.08, w: 0.38, h: 0.28 },
        { nombre: 'ci-region-c', x: 0.40, y: 0.02, w: 0.58, h: 0.30 },
      ];

      for (const region of regionesCi) {
        const left = Math.max(0, Math.floor(metadata.width * region.x));
        const top = Math.max(0, Math.floor(metadata.height * region.y));
        const width = Math.max(70, Math.floor(metadata.width * region.w));
        const height = Math.max(50, Math.floor(metadata.height * region.h));

        const safeWidth = Math.min(width, metadata.width - left);
        const safeHeight = Math.min(height, metadata.height - top);
        if (safeWidth <= 0 || safeHeight <= 0) {
          continue;
        }

        const regionCi = await sharp(rutaImagen)
          .rotate()
          .extract({ left, top, width: safeWidth, height: safeHeight })
          .resize({
            width: Math.max(220, safeWidth * 3),
            height: Math.max(120, safeHeight * 3),
            kernel: sharp.kernel.nearest,
            fit: 'fill',
          })
          .grayscale()
          .normalize()
          .linear(1.55, -20)
          .sharpen({ sigma: 1.35 })
          .threshold(145)
          .jpeg({ quality: 96 })
          .toBuffer();

        variantes.push({
          nombre: region.nombre,
          buffer: regionCi,
          priorizarSoloNumeros: true,
        });
      }
    }

    return variantes;
  }

  /**
   * Intenta ejecutar OCR con un idioma determinado.
   * @param rutaImagen Ruta local del archivo.
   * @param idioma Idioma de Tesseract (ej. 'spa', 'eng').
   * @returns Texto extraido o cadena vacia si falla.
   */
  private async intentarOcrConIdioma(
    imagen: Buffer,
    idioma: string,
    opciones: {
      traceId: string;
      variante: string;
      soloNumeros: boolean;
    },
  ): Promise<string> {
    const worker = await createWorker(idioma);

    try {
      await worker.reinitialize(idioma);
      const parametros: Record<string, string> = {
        tessedit_pageseg_mode: '6',
      };

      if (opciones.soloNumeros) {
        parametros.tessedit_char_whitelist = '0123456789';
        parametros.classify_bln_numeric_mode = '1';
      }

      await (worker as unknown as { setParameters: (p: Record<string, string>) => Promise<void> })
        .setParameters(parametros);

      const resultado = await worker.recognize(imagen);

      const texto = String(resultado.data.text || '').trim();
      this.logDebug(opciones.traceId, 'OCR ejecutado', {
        idioma,
        variante: opciones.variante,
        modo: opciones.soloNumeros ? 'digits' : 'general',
        totalCaracteres: texto.length,
      });
      return texto;
    } catch (error: unknown) {
      this.logDebug(opciones.traceId, 'Fallo OCR por idioma', {
        idioma,
        variante: opciones.variante,
        modo: opciones.soloNumeros ? 'digits' : 'general',
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    } finally {
      await worker.terminate();
    }
  }

  private async extraerDatosConGemini(rutaImagen: string, traceId: string): Promise<ResultadoOcrCarnet | null> {
    if (!this.geminiApiKey) {
      this.logDebug(traceId, 'Gemini no configurado: GEMINI_API_KEY vacia.');
      return null;
    }

    try {
      const imagenBuffer = await fs.promises.readFile(rutaImagen);
      const base64 = imagenBuffer.toString('base64');
      const mimeType = this.detectarMimeTypeImagen(rutaImagen);
      const endpoint = `${this.geminiBaseUrl}/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

      const prompt = [
        'Extrae de esta cedula boliviana SOLO estos campos: ci, nombres, apellidos y candidatosCi.',
        'Responde UNICAMENTE en JSON valido con este esquema:',
        '{"ci":"","nombres":"","apellidos":"","candidatosCi":[]}',
        'ci debe ser numero de carnet, NO fecha de nacimiento ni fecha de emision.',
        'candidatosCi puede incluir hasta 5 alternativas numericas probables.',
        'Si no encuentras un campo, devuelvelo como cadena vacia.',
      ].join(' ');

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      };

      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await axios.post(endpoint, payload, {
            timeout: this.geminiTimeoutMs,
          });
          break;
        } catch (e: any) {
          if (attempt === 3) throw e;
          const status = e.response?.status;
          if (status === 503 || status === 500 || status === 429) {
            this.logDebug(traceId, `Gemini fallo con ${status}. Reintento ${attempt} de 3 en 1.5s...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          throw e;
        }
      }

      const textoRespuesta = this.extraerTextoDeRespuestaGemini(response.data);
      if (!textoRespuesta) {
        this.logDebug(traceId, 'Gemini respondio sin texto util.');
        return null;
      }

      const json = this.parsearJsonSeguro(textoRespuesta);
      if (!json || typeof json !== 'object') {
        this.logDebug(traceId, 'Gemini no retorno JSON parseable.', {
          muestra: textoRespuesta.slice(0, 200),
        });
        return null;
      }

      const ci = String((json as Record<string, unknown>).ci || '').replace(/\D/g, '');
      const candidatosRaw = (json as Record<string, unknown>).candidatosCi;
      const candidatosCi = Array.isArray(candidatosRaw)
        ? candidatosRaw.map(item => String(item || ''))
        : [];
      const nombres = String((json as Record<string, unknown>).nombres || '').trim();
      const apellidos = String((json as Record<string, unknown>).apellidos || '').trim();

      const resultado: ResultadoOcrCarnet = {
        ci,
        nombres,
        apellidos,
        candidatosCi: this.normalizarCandidatosCi([ci, ...candidatosCi]),
      };

      this.logDebug(traceId, 'Gemini OCR parseado', {
        ciLen: resultado.ci.length,
        totalCandidatosCi: resultado.candidatosCi.length,
        nombresLen: resultado.nombres.length,
        apellidosLen: resultado.apellidos.length,
      });

      return resultado;
    } catch (error: unknown) {
      this.logDebug(traceId, 'Gemini OCR fallo', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private detectarMimeTypeImagen(rutaImagen: string): string {
    const ext = path.extname(rutaImagen).toLowerCase();
    if (ext === '.png') {
      return 'image/png';
    }
    return 'image/jpeg';
  }

  private extraerTextoDeRespuestaGemini(data: unknown): string {
    const root = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const parts = root?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map(item => String(item?.text || ''))
      .join('\n')
      .trim();

    return text;
  }

  private parsearJsonSeguro(texto: string): unknown {
    const limpio = texto.trim();
    if (!limpio) {
      return null;
    }

    try {
      return JSON.parse(limpio);
    } catch {
      const match = /\{[\s\S]*\}/.exec(limpio);
      if (!match?.[0]) {
        return null;
      }
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
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

  /**
   * Extrae CI, nombres y apellidos desde el texto OCR.
   * @param texto Texto crudo extraido.
   * @returns Datos parseados.
   */
  private extraerDatosDesdeTextoOcr(texto: string): ResultadoOcrCarnet {
    const textoNormalizado = String(texto || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\t\f\v]+/g, ' ');

    const ci = this.extraerCiDesdeTexto(textoNormalizado);
    const candidatosCi = this.extraerCandidatosCiDesdeTexto(textoNormalizado);
    const nombres = this.extraerCampoMayusculas(textoNormalizado, ['NOMBRES', 'NOMBRE']);
    const apellidos = this.extraerCampoMayusculas(textoNormalizado, ['APELLIDOS', 'APELLIDO']);

    return {
      ci,
      nombres,
      apellidos,
      candidatosCi,
    };
  }

  private extraerCandidatosCiDesdeTexto(texto: string): string[] {
    const textoCompat = String(texto || '')
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');

    const candidatosDirectos = textoCompat.match(/\b\d{6,10}\b/g) || [];
    const candidatosSeparados = textoCompat.match(/\d(?:[\s.\-]?\d){5,11}/g) || [];

    const candidatos = [...candidatosDirectos, ...candidatosSeparados]
      .map(item => item.replace(/\D/g, ''))
      .filter(item => item.length >= 6 && item.length <= 10)
      .filter(item => !this.pareceFecha(item));

    const unicos = Array.from(new Set(candidatos));
    unicos.sort((a, b) => this.puntuarCandidatoCi(b) - this.puntuarCandidatoCi(a));
    return unicos;
  }

  private normalizarCandidatosCi(candidatos: Array<string | undefined | null>): string[] {
    const limpios = candidatos
      .map(item => String(item || '').replace(/\D/g, ''))
      .filter(item => item.length >= 6 && item.length <= 10)
      .filter(item => !this.pareceFecha(item));

    const unicos = Array.from(new Set(limpios));
    unicos.sort((a, b) => this.puntuarCandidatoCi(b) - this.puntuarCandidatoCi(a));
    return unicos;
  }

  /**
   * Busca un CI en el texto (7 a 10 digitos).
   * @param texto Texto OCR.
   * @returns CI encontrado o cadena vacia.
   */
  private extraerCiDesdeTexto(texto: string): string {
    const textoCompat = String(texto || '')
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');

    const lineas = textoCompat
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const conEtiquetaEnLinea = lineas
      .filter(item => /\b(CI|C\.\s*I\.?|CEDULA|CÉDULA|NRO|N\s*[°º]|N\s*o)\b/i.test(item))
      .flatMap(item => item.match(/\d(?:[\s.\-]?\d){6,11}/g) || [])
      .map(item => item.replace(/\D/g, ''))
      .filter(item => item.length >= 6 && item.length <= 10);

    if (conEtiquetaEnLinea.length > 0) {
      return conEtiquetaEnLinea[0];
    }

    const conEtiqueta = /(?:\bCI\b|\bC\.?I\.?\b|\bCARNET\b|\bCEDULA\b|\bCÉDULA\b|\bNRO\b|\bN\s*[°º]\b|\bN\s*o\b)\s*[:\-]?\s*([\d\s.\-]{7,16})/i.exec(textoCompat);
    if (conEtiqueta?.[1]) {
      const limpio = conEtiqueta[1].replace(/\D/g, '');
      if (limpio.length >= 6 && limpio.length <= 10) {
        return limpio;
      }
    }

    const candidatosDirectos = textoCompat.match(/\b\d{7,10}\b/g) || [];
    const candidatosSeparados = textoCompat.match(/\d(?:[\s.\-]?\d){6,11}/g) || [];
    const candidatos = [...candidatosDirectos, ...candidatosSeparados]
      .map(item => item.replace(/\D/g, ''))
      .filter(item => item.length >= 6 && item.length <= 10);

    const unique = Array.from(new Set(candidatos));
    if (unique.length === 0) {
      return '';
    }

    unique.sort((a, b) => this.puntuarCandidatoCi(b) - this.puntuarCandidatoCi(a));
    return unique[0] || '';
  }

  private puntuarCandidatoCi(ci: string): number {
    // Priorizamos longitud 7-8 (comun en padron local) y penalizamos secuencias triviales.
    let score = 0;

    if (ci.length === 7) score += 3;
    if (ci.length === 8) score += 2;
    if (ci.length === 9) score += 1;
    if (ci.length === 6) score += 1;

    if (/^(\d)\1+$/.test(ci)) score -= 4;
    if (/12345|23456|34567|45678|56789/.test(ci)) score -= 2;
    if (/0{4,}/.test(ci)) score -= 1;
    if (this.pareceFecha(ci)) score -= 4;

    return score;
  }

  private pareceFecha(valor: string): boolean {
    if (valor.length !== 8) {
      return false;
    }

    const dd = Number(valor.slice(0, 2));
    const mm = Number(valor.slice(2, 4));
    const yyyy = Number(valor.slice(4, 8));

    return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 2100;
  }

  /**
   * Extrae un campo (NOMBRES/APELLIDOS) basado en palabras en mayusculas despues de una etiqueta.
   * @param texto Texto OCR.
   * @param etiquetas Posibles etiquetas.
   * @returns Valor extraido o cadena vacia.
   */
  private extraerCampoMayusculas(texto: string, etiquetas: ReadonlyArray<string>): string {
    const etiquetaPattern = etiquetas.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?:${etiquetaPattern})\\s*[:\\-]?\\s*([A-ZÁÉÍÓÚÜÑ\\s]{3,})`, 'm');
    const match = regex.exec(texto);
    if (!match?.[1]) {
      return '';
    }

    const capturado = match[1]
      .split('\n')[0]
      .replace(/\s+/g, ' ')
      .trim();

    return capturado;
  }

  /**
   * Elimina archivos temporales guardados por Multer en /temp.
   * @param archivos Archivos del request.
   * @returns Promesa resuelta al finalizar el intento de borrado.
   */
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
      })
    );
  }

  /**
   * Verifica si dos campos de texto coinciden con tolerancia ante diferencias de OCR.
   *
   * Aplica normalizacion (minusculas, sin tildes, sin signos) y luego compara:
   * - igualdad exacta, o
   * - similitud Levenshtein >= 0.85
   *
   * @param valorPadron Valor registrado en el padron.
   * @param valorOcr Valor leido por OCR.
   * @returns `true` si se consideran equivalentes.
   */
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

  /**
   * Normaliza texto para comparaciones robustas:
   * - elimina tildes/diacriticos
   * - convierte a minusculas
   * - remueve caracteres no alfanumericos (los vuelve espacios)
   * - colapsa espacios
   *
   * @param valor Texto de entrada.
   * @returns Texto normalizado.
   */
  private normalizarTextoParaComparacion(valor: string): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula la similitud basada en distancia Levenshtein normalizada.
   *
   * La similitud se define como: $1 - \frac{dist(a,b)}{max(|a|,|b|)}$.
   *
   * @param a Primer texto.
   * @param b Segundo texto.
   * @returns Valor entre 0 y 1.
   */
  private similitudLevenshtein(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
      return 1;
    }
    const dist = this.distanciaLevenshtein(a, b);
    return 1 - dist / maxLen;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos cadenas.
   *
   * @param a Primer texto.
   * @param b Segundo texto.
   * @returns Distancia (numero de ediciones minimas).
   */
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

  /**
   * Ejecuta la verificacion facial comparando el rostro del carnet con la selfie.
   *
   * Carga modelos una sola vez y luego:
   * - extrae descriptor del rostro en carnet y selfie
   * - calcula distancia euclidiana
   * - valida umbral (< 0.6)
   *
   * @param rutaCarnetFrontal Ruta local de la imagen frontal del carnet.
   * @param rutaSelfie Ruta local de la selfie.
   * @returns `true` si la distancia cumple el umbral.
   * @throws BadRequestException si no se detecta un rostro en alguna imagen.
   */
  private async verificarRostro(rutaCarnetFrontal: string, rutaSelfie: string): Promise<boolean> {
    try {
      const faceapi = await this.obtenerFaceApi();
      await this.cargarModelosFaciales(faceapi);

      const descriptorCarnet = await this.calcularDescriptorFacial(faceapi, rutaCarnetFrontal);
      if (!descriptorCarnet) {
        throw new BadRequestException('No se detecto un rostro en la imagen frontal del carnet.');
      }

      const descriptorSelfie = await this.calcularDescriptorFacial(faceapi, rutaSelfie);
      if (!descriptorSelfie) {
        throw new BadRequestException('No se detecto un rostro en la selfie.');
      }

      const distancia = this.distanciaEuclidiana(descriptorCarnet, descriptorSelfie);
      const esMatch = distancia < 0.6;
      
      this.logger.log(
        `[Verificacion Facial 1:1] Distancia calculada: ${distancia.toFixed(4)} (Umbral: <0.6) | Match Exitoso: ${esMatch}`
      );
      
      return esMatch;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      const runtimeTextEncoderIncompatible = /TextEncoder is not a constructor/i.test(mensaje);

      if (runtimeTextEncoderIncompatible && this.permitirBypassFaceMatchPorRuntime) {
        this.logger.warn(
          'Bypass temporal de verificacion facial por incompatibilidad runtime de FaceAPI (TextEncoder).',
        );
        return true;
      }

      throw error;
    }
  }

  // Nota: este import evita el entrypoint Node que requiere @tensorflow/tfjs-node.
  private faceApiEsmPromise: Promise<any> | null = null;
  private modelosFacialesCargados = false;

  /**
   * Obtiene el modulo FaceAPI usando el build ESM.
   *
   * Se hace import dinamico para evitar el entrypoint Node que requiere `@tensorflow/tfjs-node`.
   *
   * @returns Modulo ESM de `@vladmandic/face-api`.
   */
  private async obtenerFaceApi(): Promise<any> {
    if (!this.faceApiEsmPromise) {
      // Usar la version WASM de Node para evitar bugs del entorno ESM en Windows
      const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
      
      // Es obligatorio esperar que WASM cargue antes de decodificar Modelos
      this.faceApiEsmPromise = faceapi.tf.ready().then(() => faceapi);
    }

    return await this.faceApiEsmPromise;
  }



  /**
   * Carga los modelos faciales desde la carpeta `/models`.
   *
   * Estructura esperada:
   * - `models/mobilenetv1/` (ssd mobilenet)
   * - `models/faceLandmark68Net/`
   * - `models/faceRecognitionNet/`
   *
   * @param faceapi Modulo FaceAPI.
   * @returns Promesa resuelta cuando los modelos estan listos.
   * @throws BadRequestException si falta alguna carpeta o no se pueden leer manifests/shards.
   */
  private async cargarModelosFaciales(faceapi: any): Promise<void> {
    if (this.modelosFacialesCargados) {
      return;
    }

    const posiblesRutas = [
      path.resolve(process.cwd(), 'models'),
      path.resolve(process.cwd(), 'SW2-grupal-backend', 'models'),
    ];

    const rutaModels = posiblesRutas.find(item => fs.existsSync(item));
    if (!rutaModels) {
      throw new BadRequestException('No se encontro la carpeta /models con los modelos faciales.');
    }

    const rutaSsdMobilenetv1 = path.join(rutaModels, 'mobilenetv1');
    const rutaFaceLandmark68Net = path.join(rutaModels, 'faceLandmark68Net');
    const rutaFaceRecognitionNet = path.join(rutaModels, 'faceRecognitionNet');

    const carpetasFaltantes = [
      { nombre: 'mobilenetv1', ruta: rutaSsdMobilenetv1 },
      { nombre: 'faceLandmark68Net', ruta: rutaFaceLandmark68Net },
      { nombre: 'faceRecognitionNet', ruta: rutaFaceRecognitionNet },
    ].filter(item => !fs.existsSync(item.ruta));

    if (carpetasFaltantes.length > 0) {
      const detalle = carpetasFaltantes.map(item => item.nombre).join(', ');
      throw new BadRequestException(`Faltan carpetas de modelos en /models: ${detalle}.`);
    }

    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(rutaSsdMobilenetv1),
        faceapi.nets.faceLandmark68Net.loadFromDisk(rutaFaceLandmark68Net),
        faceapi.nets.faceRecognitionNet.loadFromDisk(rutaFaceRecognitionNet),
      ]);
    } catch (_error: unknown) {
      throw new BadRequestException('No se pudieron cargar los modelos faciales desde /models (revisa manifests y shards).');
    }

    this.modelosFacialesCargados = true;
  }

  /**
   * Calcula el descriptor facial (embedding) de la primera cara detectada en una imagen.
   *
   * Decodifica la imagen con `sharp` a RGB raw y la convierte a tensor para procesarla con FaceAPI.
   *
   * @param faceapi Modulo FaceAPI.
   * @param rutaImagen Ruta local de la imagen.
   * @returns Descriptor como `Float32Array` o `null` si no se detecta rostro.
   */
  private async calcularDescriptorFacial(faceapi: any, rutaImagen: string): Promise<Float32Array | null> {
    const tf = faceapi.tf;

    const { data, info } = await sharp(rutaImagen)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })  // Elimina canal Alpha fusionando sobre fondo blanco
      .toColorspace('srgb')                                   // Espacio de color soportado por libvips/Sharp
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const height = info.height;
    const width = info.width;
    const channels = info.channels;
    const input = tf.tensor3d(new Uint8Array(data), [height, width, channels], 'int32');

    try {
      const deteccion = await faceapi
        .detectSingleFace(
          input,
          new faceapi.SsdMobilenetv1Options({
            minConfidence: 0.5,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!deteccion?.descriptor) {
        return null;
      }

      return deteccion.descriptor as Float32Array;
    } finally {
      input.dispose();
    }
  }

  /**
   * Calcula distancia euclidiana entre dos vectores (descriptores faciales).
   *
   * @param a Descriptor A.
   * @param b Descriptor B.
   * @returns Distancia euclidiana.
   */
  private distanciaEuclidiana(a: Float32Array, b: Float32Array): number {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
