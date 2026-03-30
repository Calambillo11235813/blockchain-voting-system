import * as mime from 'mime-types';
import sharp from 'sharp';

/**
 * Resultado de la validación de una imagen
 */
export interface ImageValidationResult {
    isValid: boolean;
    error?: string;
    metadata?: sharp.Metadata;
}

/**
 * Opciones para la validación de imágenes
 */
export interface ImageValidationOptions {
    /** Tamaño máximo en bytes (por defecto 5MB) */
    maxSize?: number;
    /** Tipos MIME permitidos */
    allowedTypes?: string[];
    /** Ancho mínimo en píxeles */
    minWidth?: number;
    /** Alto mínimo en píxeles */
    minHeight?: number;
    /** Ancho máximo en píxeles */
    maxWidth?: number;
    /** Alto máximo en píxeles */
    maxHeight?: number;
    /** Si se deben validar las dimensiones (true por defecto) */
    validateDimensions?: boolean;
}

/**
 * Valida si un archivo es una imagen válida
 * 
 * @param file - Archivo a validar
 * @param options - Opciones de validación
 * @returns Resultado de la validación
 */
export async function validateImage(
    file: Express.Multer.File,
    options?: ImageValidationOptions
): Promise<ImageValidationResult> {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB por defecto
        allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
        minWidth = 0,
        minHeight = 0,
        maxWidth = 10000,
        maxHeight = 10000,
        validateDimensions = true
    } = options || {};

    // Verificar si existe el archivo
    if (!file || !file.buffer) {
        return { isValid: false, error: 'No se proporcionó ningún archivo' };
    }

    // Verificar el tamaño del archivo
    if (file.size > maxSize) {
        return {
            isValid: false,
            error: `El archivo excede el tamaño máximo permitido de ${(maxSize / (1024 * 1024)).toFixed(2)}MB`
        };
    }

    // Detectar el tipo de archivo real basado en su contenido
    const detectedMimeType = mime.lookup(file.originalname) || file.mimetype;

    // Si no se pudo detectar el tipo, no es un formato conocido
    if (!allowedTypes.includes(detectedMimeType)) {
        return {
            isValid: false,
            error: `Tipo de archivo no permitido. Los formatos aceptados son: ${allowedTypes.join(', ')}`
        };
    }

    // Validar dimensiones si se solicita
    if (validateDimensions) {
        try {
            const metadata = await sharp(file.buffer).metadata();

            if (!metadata.width || !metadata.height) {
                return { isValid: false, error: 'No se pudieron determinar las dimensiones de la imagen' };
            }

            if (metadata.width < minWidth) {
                return {
                    isValid: false,
                    error: `El ancho de la imagen (${metadata.width}px) es menor que el mínimo requerido (${minWidth}px)`,
                    metadata
                };
            }

            if (metadata.height < minHeight) {
                return {
                    isValid: false,
                    error: `La altura de la imagen (${metadata.height}px) es menor que el mínimo requerido (${minHeight}px)`,
                    metadata
                };
            }

            if (metadata.width > maxWidth) {
                return {
                    isValid: false,
                    error: `El ancho de la imagen (${metadata.width}px) excede el máximo permitido (${maxWidth}px)`,
                    metadata
                };
            }

            if (metadata.height > maxHeight) {
                return {
                    isValid: false,
                    error: `La altura de la imagen (${metadata.height}px) excede el máximo permitido (${maxHeight}px)`,
                    metadata
                };
            }

            // Todos los chequeos pasaron
            return { isValid: true, metadata };
        } catch (error) {
            return {
                isValid: false,
                error: `Error al procesar la imagen: ${error.message}`
            };
        }
    }

    // Si no validamos dimensiones y llegamos aquí, todo está bien
    return { isValid: true };
}