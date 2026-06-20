import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { ArchivosBiometriaValidados } from '../dto/validar-identidad-archivos.dto';

export interface ResultadoOcrCarnet {
  ci: string;
  nombres: string;
  apellidos: string;
  candidatosCi: string[];
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrProvider: string;
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly geminiBaseUrl: string;
  private readonly geminiTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ocrProvider = String(
      this.configService.get<string>('BIOMETRIA_OCR_PROVIDER') ||
        process.env.BIOMETRIA_OCR_PROVIDER ||
        'gemini_then_local',
    ).toLowerCase();
    this.geminiApiKey = String(
      this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '',
    );
    this.geminiModel = String(
      this.configService.get<string>('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    );
    this.geminiBaseUrl = String(
      this.configService.get<string>('GEMINI_BASE_URL') ||
        process.env.GEMINI_BASE_URL ||
        'https://generativelanguage.googleapis.com/v1beta',
    );
    this.geminiTimeoutMs = Number(
      this.configService.get<number>('GEMINI_TIMEOUT_MS') || process.env.GEMINI_TIMEOUT_MS || 12000,
    );
  }

  /**
   * Extrae CI y datos del estudiante desde las imagenes del carnet.
   */
  async extraerDatosDesdeCarnet(
    archivos: ArchivosBiometriaValidados,
    traceId: string,
  ): Promise<ResultadoOcrCarnet> {
    const rutaImagen = archivos.frontal.path;
    let textoExtraido = '';
    let datos: ResultadoOcrCarnet = { ci: '', nombres: '', apellidos: '', candidatosCi: [] };

    if (this.ocrProvider === 'gemini_then_local') {
      this.logTrace(traceId, 'OCR: intentando Gemini primero (gemini_then_local)');
      const datosGemini = await this.extraerDatosConGemini(rutaImagen, traceId);
      const geminiCompleto = Boolean(datosGemini?.ci && datosGemini?.nombres && datosGemini?.apellidos);

      if (geminiCompleto && datosGemini) {
        this.logTrace(traceId, 'OCR: Gemini retorno datos completos. Tesseract omitido.');
        return datosGemini;
      }

      this.logTrace(traceId, 'OCR: Gemini incompleto o fallo. Activando Tesseract como respaldo.');
      textoExtraido = await this.ejecutarOcrSobreImagen(rutaImagen, traceId);
      this.logTrace(traceId, 'Texto OCR Tesseract (resumen)', {
        totalCaracteres: textoExtraido.length,
        muestra: textoExtraido.replace(/\s+/g, ' ').trim().slice(0, 280),
      });
      const datosLocal = this.extraerDatosDesdeTextoOcr(textoExtraido);

      datos = {
        ci: datosGemini?.ci || datosLocal.ci,
        nombres: datosGemini?.nombres || datosLocal.nombres,
        apellidos: datosGemini?.apellidos || datosLocal.apellidos,
        candidatosCi: this.normalizarCandidatosCi([
          ...(datosGemini?.candidatosCi || []),
          ...(datosLocal.candidatosCi || []),
        ]),
      };
    } else if (this.ocrProvider === 'gemini') {
      this.logTrace(traceId, 'OCR: solo Gemini');
      const datosGemini = await this.extraerDatosConGemini(rutaImagen, traceId);
      if (datosGemini) {
        datos = datosGemini;
      }
    } else if (this.ocrProvider === 'local_then_gemini') {
      this.logTrace(traceId, 'OCR: Tesseract primero, Gemini de respaldo');
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
    } else {
      this.logTrace(traceId, 'OCR: solo Tesseract (local)');
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

  normalizarCandidatosCi(candidatos: Array<string | undefined | null>): string[] {
    const limpios = candidatos
      .map(item => String(item || '').replace(/\D/g, ''))
      .filter(item => item.length >= 6 && item.length <= 10)
      .filter(item => !this.pareceFecha(item));

    const unicos = Array.from(new Set(limpios));
    unicos.sort((a, b) => this.puntuarCandidatoCi(b) - this.puntuarCandidatoCi(a));
    return unicos;
  }

  pareceFecha(valor: string): boolean {
    if (valor.length !== 8) {
      return false;
    }

    const dd = Number(valor.slice(0, 2));
    const mm = Number(valor.slice(2, 4));
    const yyyy = Number(valor.slice(4, 8));

    return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 2100;
  }

  private logTrace(traceId: string, message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.log(`[${traceId}] ${message} | ${JSON.stringify(context)}`);
      return;
    }

    this.logger.log(`[${traceId}] ${message}`);
  }

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
          .filter(item => item.length > 0),
      ),
    );

    this.logTrace(traceId, 'Variantes OCR procesadas', {
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
      this.logTrace(opciones.traceId, 'OCR ejecutado', {
        idioma,
        variante: opciones.variante,
        modo: opciones.soloNumeros ? 'digits' : 'general',
        totalCaracteres: texto.length,
      });
      return texto;
    } catch (error: unknown) {
      this.logTrace(opciones.traceId, 'Fallo OCR por idioma', {
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
      this.logTrace(traceId, 'Gemini no configurado: GEMINI_API_KEY vacia.');
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
            this.logTrace(traceId, `Gemini fallo con ${status}. Reintento ${attempt} de 3 en 1.5s...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          throw e;
        }
      }

      const textoRespuesta = this.extraerTextoDeRespuestaGemini(response.data);
      if (!textoRespuesta) {
        this.logTrace(traceId, 'Gemini respondio sin texto util.');
        return null;
      }

      const json = this.parsearJsonSeguro(textoRespuesta);
      if (!json || typeof json !== 'object') {
        this.logTrace(traceId, 'Gemini no retorno JSON parseable.', {
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

      this.logTrace(traceId, 'Gemini OCR parseado', {
        ciLen: resultado.ci.length,
        totalCandidatosCi: resultado.candidatosCi.length,
        nombresLen: resultado.nombres.length,
        apellidosLen: resultado.apellidos.length,
      });

      return resultado;
    } catch (error: unknown) {
      this.logTrace(traceId, 'Gemini OCR fallo', {
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

  private extraerDatosDesdeTextoOcr(texto: string): ResultadoOcrCarnet {
    const textoNormalizado = this.limpiarTextoOcr(texto);

    const ci = this.extraerCiDesdeTexto(textoNormalizado);
    const candidatosCi = this.extraerCandidatosCiDesdeTexto(textoNormalizado);
    let nombres = this.extraerCampoMayusculas(textoNormalizado, ['NOMBRES', 'NOMBRE']);
    let apellidos = this.extraerCampoMayusculas(textoNormalizado, ['APELLIDOS', 'APELLIDO']);

    if (!nombres || !apellidos) {
      const candidatosLinea = this.extraerLineasMayusculas(textoNormalizado)
        .filter(item => item !== nombres && item !== apellidos);

      if (!apellidos && candidatosLinea.length > 0) {
        apellidos = candidatosLinea[0];
      }

      if (!nombres) {
        const restantes = candidatosLinea.filter(item => item !== apellidos);
        if (restantes.length > 0) {
          nombres = restantes[0];
        }
      }
    }

    return {
      ci,
      nombres,
      apellidos,
      candidatosCi,
    };
  }

  private limpiarTextoOcr(texto: string): string {
    return String(texto || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[—–‐‑‒―−]/g, '-')
      .replace(/[\t\f\v]+/g, ' ')
      .split('\n')
      .map(linea => linea.replace(/\s+/g, ' ').trim())
      .filter(linea => linea.length > 0)
      .join('\n')
      .trim();
  }

  private extraerLineasMayusculas(texto: string): string[] {
    const excluirEtiquetas = /\b(CI|C\.?\s*I\.?|CEDULA|CÉDULA|CARNET|FECHA|EXPEDICION|NACIMIENTO|DOMICILIO|NRO|DEPARTAMENTO|NOMBRES?|APELLIDOS?)\b/i;

    return texto
      .split('\n')
      .map(linea => linea.trim())
      .filter(linea => linea.length >= 4 && !excluirEtiquetas.test(linea))
      .map(linea => {
        const match = linea.match(/\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})+\b/);
        return match ? match[0].replace(/\s+/g, ' ').trim() : '';
      })
      .filter(item => item.length >= 4);
  }

  private sanitizarValorCampo(valor: string): string {
    return valor
      .replace(/^[\s:\-—–]+/, '')
      .replace(/[\s:\-—–]+$/, '')
      .split('\n')[0]
      .replace(/\s+/g, ' ')
      .trim();
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

  private extraerCampoMayusculas(texto: string, etiquetas: ReadonlyArray<string>): string {
    const etiquetaPattern = etiquetas.map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const separador = '(?:[:\\-—–]|[\\s\\-—–])*';
    const regex = new RegExp(
      `(?:${etiquetaPattern})${separador}([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ\\s]{1,})`,
      'im',
    );

    const match = regex.exec(texto);
    if (match?.[1]) {
      const valor = this.sanitizarValorCampo(match[1]);
      if (valor.length >= 2) {
        return valor;
      }
    }

    const lineas = texto.split('\n');
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];

      for (const etiqueta of etiquetas) {
        const idx = linea.toUpperCase().indexOf(etiqueta.toUpperCase());
        if (idx < 0) {
          continue;
        }

        let resto = linea.substring(idx + etiqueta.length).trim();
        resto = resto.replace(/^[\s:\-—–]+/, '').trim();

        if (resto.length === 0 && i + 1 < lineas.length) {
          resto = lineas[i + 1].trim();
        }

        if (resto.length === 0) {
          continue;
        }

        const mayusculas = resto.match(/\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})+\b/);
        if (mayusculas?.[0]) {
          return this.sanitizarValorCampo(mayusculas[0]);
        }

        const partes = resto.match(/[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]*(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]*)+/);
        if (partes?.[0]) {
          return this.sanitizarValorCampo(partes[0]);
        }

        const valor = this.sanitizarValorCampo(resto);
        if (valor.length >= 2) {
          return valor;
        }
      }
    }

    return '';
  }
}
