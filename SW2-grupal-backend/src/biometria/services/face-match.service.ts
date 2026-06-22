import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class FaceMatchService {
  private readonly logger = new Logger(FaceMatchService.name);
  private readonly permitirBypassFaceMatchPorRuntime: boolean;
  private readonly faceMatchThreshold: number;
  private readonly minConfidence: number;
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly geminiBaseUrl: string;
  private readonly geminiTimeoutMs: number;
  private readonly geminiMinConfianza: number;
  private faceApiEsmPromise: Promise<any> | null = null;
  private modelosFacialesCargados = false;

  constructor(private readonly configService: ConfigService) {
    this.permitirBypassFaceMatchPorRuntime =
      String(
        this.configService.get<string>('BIOMETRIA_FACE_MATCH_ALLOW_RUNTIME_BYPASS') ||
          process.env.BIOMETRIA_FACE_MATCH_ALLOW_RUNTIME_BYPASS ||
          '',
      ).toLowerCase() === 'true' ||
      process.env.NODE_ENV !== 'production';
    this.faceMatchThreshold = Number(
      this.configService.get<number>('FACE_MATCH_THRESHOLD') ||
        process.env.FACE_MATCH_THRESHOLD ||
        0.65,
    );
    this.minConfidence = Number(
      this.configService.get<number>('FACE_MIN_CONFIDENCE') ||
        process.env.FACE_MIN_CONFIDENCE ||
        0.3,
    );
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
    this.geminiMinConfianza = Number(
      this.configService.get<number>('GEMINI_FACE_MIN_CONFIDENCE') ||
        process.env.GEMINI_FACE_MIN_CONFIDENCE ||
        0.8,
    );
  }

  /**
   * Ejecuta la verificacion facial comparando el rostro del carnet con la selfie.
   *
   * Estrategia: intenta primero con FaceAPI local. Si falla por cualquier
   * motivo (rostro no detectado, TextEncoder, tensor shape, etc.), hace
   * fallback automático a Gemini Vision.
   */
  async verificarRostro(rutaCarnetFrontal: string, rutaSelfie: string): Promise<boolean> {
    // ── Paso 1: Intentar con FaceAPI local ───────────────────────────────
    try {
      const resultado = await this.verificarRostroConFaceApi(rutaCarnetFrontal, rutaSelfie);
      return resultado;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[FaceMatch] FaceAPI local falló: ${mensaje}. Intentando fallback con Gemini Vision...`,
      );
    }

    // ── Paso 2: Fallback a Gemini Vision ─────────────────────────────────
    try {
      const resultado = await this.verificarRostroConGemini(rutaCarnetFrontal, rutaSelfie);
      return resultado;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FaceMatch] Gemini Vision también falló: ${mensaje}`);
      throw new BadRequestException(
        'No se pudo verificar el rostro ni con FaceAPI ni con Gemini Vision.',
      );
    }
  }

  /**
   * Verificación facial usando FaceAPI local (@vladmandic/face-api).
   */
  private async verificarRostroConFaceApi(
    rutaCarnetFrontal: string,
    rutaSelfie: string,
  ): Promise<boolean> {
    const faceapi = await this.obtenerFaceApi();
    await this.cargarModelosFaciales(faceapi);

    const descriptorCarnet = await this.calcularDescriptorFacial(faceapi, rutaCarnetFrontal);
    if (!descriptorCarnet) {
      throw new Error('No se detectó un rostro en la imagen frontal del carnet (FaceAPI).');
    }

    const descriptorSelfie = await this.calcularDescriptorFacial(faceapi, rutaSelfie);
    if (!descriptorSelfie) {
      throw new Error('No se detectó un rostro en la selfie (FaceAPI).');
    }

    const distancia = this.distanciaEuclidiana(descriptorCarnet, descriptorSelfie);
    const esMatch = distancia < this.faceMatchThreshold;

    this.logger.log(
      `[FaceMatch][FaceAPI] Distancia: ${distancia.toFixed(4)} | Umbral: ${this.faceMatchThreshold} | Match: ${esMatch ? '✅ Exitoso' : '❌ Fallido'}`,
    );
    return esMatch;
  }

  /**
   * Verificación facial usando Gemini Vision API.
   *
   * Envía ambas imágenes (carnet + selfie) como inline_data en base64 y
   * solicita un JSON con { sonLaMismaPersona: boolean, confianza: number }.
   *
   * Retorna true si sonLaMismaPersona === true Y confianza >= geminiMinConfianza.
   */
  async verificarRostroConGemini(
    rutaCarnetFrontal: string,
    rutaSelfie: string,
  ): Promise<boolean> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini no configurado: GEMINI_API_KEY vacía.');
    }

    const [bufferCarnet, bufferSelfie] = await Promise.all([
      fs.promises.readFile(rutaCarnetFrontal),
      fs.promises.readFile(rutaSelfie),
    ]);

    const base64Carnet = bufferCarnet.toString('base64');
    const base64Selfie = bufferSelfie.toString('base64');
    const mimeCarnet = this.detectarMimeType(rutaCarnetFrontal);
    const mimeSelfie = this.detectarMimeType(rutaSelfie);

    const endpoint = `${this.geminiBaseUrl}/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;

    const prompt = [
      'Compara estas dos imágenes.',
      'La primera es la foto de un carnet de identidad boliviano.',
      'La segunda es una selfie tomada con la cámara del dispositivo.',
      'Determina si ambas imágenes muestran a la MISMA persona.',
      'Responde ÚNICAMENTE en JSON válido con este esquema exacto:',
      '{"sonLaMismaPersona": true, "confianza": 0.95}',
      'Donde "sonLaMismaPersona" es true o false y "confianza" es un número entre 0.0 y 1.0.',
      'No incluyas texto adicional, solo el JSON.',
    ].join(' ');

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeCarnet,
                data: base64Carnet,
              },
            },
            {
              inline_data: {
                mime_type: mimeSelfie,
                data: base64Selfie,
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

    let response: any;
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
          this.logger.warn(
            `[FaceMatch][Gemini] Fallo con HTTP ${status}. Reintento ${attempt}/3 en 1.5s...`,
          );
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        throw e;
      }
    }

    const textoRespuesta = this.extraerTextoDeRespuestaGemini(response.data);
    if (!textoRespuesta) {
      throw new Error('Gemini respondió sin texto útil en la comparación facial.');
    }

    const json = this.parsearJsonSeguro(textoRespuesta) as Record<string, unknown> | null;
    if (!json || typeof json !== 'object') {
      throw new Error(`Gemini no retornó JSON parseable: ${textoRespuesta.slice(0, 200)}`);
    }

    const sonLaMismaPersona = Boolean(json.sonLaMismaPersona);
    const confianza = Number(json.confianza || 0);
    const esMatch = sonLaMismaPersona && confianza >= this.geminiMinConfianza;

    this.logger.log(
      `[FaceMatch][Gemini] sonLaMismaPersona: ${sonLaMismaPersona} | confianza: ${confianza.toFixed(4)} | umbral: ${this.geminiMinConfianza} | Match: ${esMatch ? '✅ Exitoso' : '❌ Fallido'}`,
    );

    return esMatch;
  }

  private async obtenerFaceApi(): Promise<any> {
    if (!this.faceApiEsmPromise) {
      const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
      this.faceApiEsmPromise = faceapi.tf.ready().then(() => faceapi);
    }

    return await this.faceApiEsmPromise;
  }

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
   * Calcula el descriptor facial de una imagen.
   *
   * Para imágenes de carnet (detectadas por nombre de archivo `frontal-*`),
   * recorta la región estimada de la foto del titular, la amplía a 300×300,
   * mejora el contraste y usa detectAllFaces para encontrar el rostro.
   *
   * Para selfies u otras imágenes, usa directamente detectSingleFace.
   */
  private async calcularDescriptorFacial(faceapi: any, rutaImagen: string): Promise<Float32Array | null> {
    const esCarnet = path.basename(rutaImagen).toLowerCase().includes('frontal');

    const metadata = await sharp(rutaImagen).metadata();
    this.logger.log(
      `[FaceMatch] Imagen original: ${metadata.width ?? '?'}x${metadata.height ?? '?'} | esCarnet: ${esCarnet} | minConf: ${this.minConfidence} | ${path.basename(rutaImagen)}`,
    );

    if (esCarnet) {
      // Intentar con recorte + ampliación + mejora de contraste
      const descriptor = await this.detectarRegionFotoCarnet(faceapi, rutaImagen, metadata);
      if (descriptor) {
        return descriptor;
      }

      // Fallback: detección genérica sobre la imagen completa
      this.logger.warn('[FaceMatch][Carnet] Recorte de región falló, intentando detección genérica...');
      return this.calcularDescriptorGenerico(faceapi, rutaImagen);
    }

    return this.calcularDescriptorGenerico(faceapi, rutaImagen);
  }

  /**
   * Extrae la región estimada de la foto del titular en un carnet boliviano,
   * la amplía a 300×300 con mejora de contraste y ejecuta detectAllFaces
   * para encontrar el rostro más confiable.
   *
   * En el carnet de identidad boliviano estándar (640×433 aprox.), la foto
   * del titular suele ubicarse en la zona izquierda-central del documento,
   * entre ~15-45% del ancho y ~20-60% del alto (~192×173 píxeles).
   * FaceAPI no puede detectar rostros tan pequeños, por eso se amplía.
   */
  private async detectarRegionFotoCarnet(
    faceapi: any,
    rutaImagen: string,
    metadata: sharp.Metadata,
  ): Promise<Float32Array | null> {
    const tf = faceapi.tf;
    const imgWidth = metadata.width || 0;
    const imgHeight = metadata.height || 0;

    if (imgWidth < 100 || imgHeight < 100) {
      this.logger.warn('[FaceMatch][Carnet] Imagen demasiado pequeña para estimar región de foto.');
      return null;
    }

    // La foto suele estar entre el 15%-45% del ancho y el 20%-60% del alto
    const left = Math.floor(imgWidth * 0.15);
    const top = Math.floor(imgHeight * 0.20);
    const width = Math.floor(imgWidth * 0.30);
    const height = Math.floor(imgHeight * 0.40);

    // Validar que la región no exceda los límites de la imagen
    if (left + width > imgWidth || top + height > imgHeight) {
      this.logger.warn('[FaceMatch][Carnet] Región estimada excede los límites de la imagen.');
      return null;
    }

    this.logger.log(
      `[FaceMatch][Carnet] Recortando región [x:${left}, y:${top}, ${width}x${height}] → ampliando a 300×300 con mejora de contraste`,
    );

    // Extraer, ampliar y mejorar contraste para que FaceAPI detecte el rostro.
    // Se mantiene en sRGB (3 canales) porque FaceAPI requiere tensores RGB.
    const { data, info } = await sharp(rutaImagen)
      .extract({ left, top, width, height })
      .resize(300, 300, { fit: 'fill', kernel: sharp.kernel.lanczos2 })
      .toColorspace('srgb')
      .removeAlpha()
      .normalize()
      .linear(1.5, -10)
      .sharpen({ sigma: 1.0 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    this.logger.log(
      `[FaceMatch][Carnet] Tensor: ${info.width}x${info.height}x${info.channels} (${data.length} bytes)`,
    );

    const input = tf.tensor3d(
      new Uint8Array(data),
      [info.height, info.width, info.channels],
      'int32',
    );

    try {
      const detecciones = await faceapi
        .detectAllFaces(
          input,
          new faceapi.SsdMobilenetv1Options({ minConfidence: this.minConfidence }),
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detecciones || detecciones.length === 0) {
        this.logger.warn('[FaceMatch][Carnet] No se detectaron rostros en la región recortada.');
        return null;
      }

      // Seleccionar el rostro con mayor confianza
      const mejor = detecciones.reduce((prev: any, curr: any) =>
        (curr.detection.score > prev.detection.score) ? curr : prev,
      );

      this.logger.log(
        `[FaceMatch][Carnet] ✅ ${detecciones.length} rostro(s) detectado(s), mejor confianza: ${mejor.detection.score.toFixed(4)}`,
      );

      return (mejor.descriptor as Float32Array) ?? null;
    } finally {
      input.dispose();
    }
  }

  /**
   * Detección genérica para selfies o como fallback.
   * Redimensiona a 640×640 con fit:'cover' y usa detectSingleFace.
   */
  private async calcularDescriptorGenerico(
    faceapi: any,
    rutaImagen: string,
  ): Promise<Float32Array | null> {
    const tf = faceapi.tf;

    const { data, info } = await sharp(rutaImagen)
      .resize(640, 640, { fit: 'cover' })
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toColorspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { height, width, channels } = info;

    this.logger.log(
      `[FaceMatch][Genérico] Tensor: ${width}x${height}x${channels} (${data.length} bytes)`,
    );

    const input = tf.tensor3d(new Uint8Array(data), [height, width, channels], 'int32');

    try {
      const deteccion = await faceapi
        .detectSingleFace(
          input,
          new faceapi.SsdMobilenetv1Options({ minConfidence: this.minConfidence }),
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

  private distanciaEuclidiana(a: Float32Array, b: Float32Array): number {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // ─── Helpers Gemini ──────────────────────────────────────────────────────────

  private detectarMimeType(rutaImagen: string): string {
    const ext = path.extname(rutaImagen).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
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
    return parts
      .map(item => String(item?.text || ''))
      .join('\n')
      .trim();
  }

  private parsearJsonSeguro(texto: string): unknown {
    const limpio = texto.trim();
    if (!limpio) return null;

    try {
      return JSON.parse(limpio);
    } catch {
      const match = /\{[\s\S]*\}/.exec(limpio);
      if (!match?.[0]) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
}
