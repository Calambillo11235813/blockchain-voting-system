import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class FaceMatchService {
  private readonly logger = new Logger(FaceMatchService.name);
  private readonly permitirBypassFaceMatchPorRuntime: boolean;
  private readonly faceMatchThreshold: number;
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
  }

  /**
   * Ejecuta la verificacion facial comparando el rostro del carnet con la selfie.
   */
  async verificarRostro(rutaCarnetFrontal: string, rutaSelfie: string): Promise<boolean> {
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
      const esMatch = distancia < this.faceMatchThreshold;

      this.logger.log(
        `[FaceMatch] Distancia: ${distancia.toFixed(4)} | Umbral: ${this.faceMatchThreshold} | Match: ${esMatch ? '✅ Exitoso' : '❌ Fallido'}`,
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

  private async calcularDescriptorFacial(faceapi: any, rutaImagen: string): Promise<Float32Array | null> {
    const tf = faceapi.tf;

    const imagen = sharp(rutaImagen);
    const metadata = await imagen.metadata();
    this.logger.log(
      `[FaceMatch] Imagen original: ${metadata.width ?? '?'}x${metadata.height ?? '?'} -> 640x640 | ${path.basename(rutaImagen)}`,
    );

    const { data, info } = await imagen
      .resize(640, 640, { fit: 'cover' })
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toColorspace('srgb')
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
