import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { mkdirSync } from 'fs';

export const TAMANIO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;
export const TIPOS_MIME_PERMITIDOS: ReadonlyArray<string> = ['image/jpeg', 'image/png'];

export type ArchivosBiometria = {
  frontal?: Express.Multer.File[];
  trasera?: Express.Multer.File[];
  selfie?: Express.Multer.File[];
};

export type ArchivosBiometriaValidados = {
  frontal: Express.Multer.File;
  trasera: Express.Multer.File;
  selfie: Express.Multer.File;
};

/**
 * DTO utilitario para validar y tipar los archivos cargados.
 */
export class ValidarIdentidadArchivosDto {
  /**
   * Valida presencia, tipo MIME y tamanio de los tres archivos.
   * @param archivos Archivos recibidos por Multer.
   * @returns Archivos validados.
   * @throws BadRequestException si falta algun archivo o no cumple restricciones.
   */
  static validar(archivos: ArchivosBiometria | undefined | null): ArchivosBiometriaValidados {
    if (!archivos) {
      throw new BadRequestException('Debe enviar tres imagenes: frontal, trasera y selfie.');
    }

    const frontal = archivos.frontal?.[0];
    const trasera = archivos.trasera?.[0];
    const selfie = archivos.selfie?.[0];

    if (!frontal || !trasera || !selfie) {
      throw new BadRequestException('Debe enviar tres imagenes: frontal, trasera y selfie.');
    }

    this.validarArchivo(frontal, 'frontal');
    this.validarArchivo(trasera, 'trasera');
    this.validarArchivo(selfie, 'selfie');

    return { frontal, trasera, selfie };
  }

  private static validarArchivo(archivo: Express.Multer.File, campo: string): void {
    if (!TIPOS_MIME_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException(
        `El archivo '${campo}' debe ser una imagen JPG o PNG.`
      );
    }

    if (archivo.size > TAMANIO_MAXIMO_IMAGEN_BYTES) {
      throw new BadRequestException(
        `El archivo '${campo}' no debe superar 5MB.`
      );
    }
  }
}

/**
 * Configuracion de Multer para HU-005.
 * - Guarda temporalmente en /temp
 * - Limita tamanio a 5MB
 * - Acepta solo image/jpeg o image/png
 */
export function crearOpcionesMulterBiometria(): {
  storage: ReturnType<typeof diskStorage>;
  limits: { fileSize: number };
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
  ) => void;
} {
  const directorioTemp = resolve(process.cwd(), 'temp');

  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        mkdirSync(directorioTemp, { recursive: true });
        cb(null, directorioTemp);
      },
      filename: (_req, file, cb) => {
        const extension = extname(file.originalname || '');
        const safeExtension = extension.length > 0 ? extension : '.jpg';
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${unique}${safeExtension}`);
      },
    }),
    limits: {
      fileSize: TAMANIO_MAXIMO_IMAGEN_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      if (!TIPOS_MIME_PERMITIDOS.includes(file.mimetype)) {
        cb(new BadRequestException('Solo se permiten imagenes JPG o PNG.') as unknown as Error, false);
        return;
      }
      cb(null, true);
    },
  };
}
