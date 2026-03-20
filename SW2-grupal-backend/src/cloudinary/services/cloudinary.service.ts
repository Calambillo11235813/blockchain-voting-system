import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Express } from 'express';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('Cloudinary') private readonly cloudinaryInstance: typeof cloudinary
  ) { }

  /**
   * Sube una imagen a Cloudinary.
   * @param file Archivo de tipo Express.Multer.File que contiene el buffer de la imagen.
   * @returns Una promesa que resuelve con la respuesta de la API de Cloudinary.
   */
  public async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('El archivo es inválido o está vacío.');
    }

    return new Promise((resolve, reject) => {
      this.cloudinaryInstance.uploader.upload_stream(
        { folder: 'uploads' },
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(
                `Error al cargar la imagen en Cloudinary: ${error.message}`
              )
            );
          }
          resolve(result);
        },
      ).end(file.buffer);
    });
  }
}
