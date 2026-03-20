import { BadRequestException, ConflictException, ForbiddenException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

let chalk;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chalk = require('chalk');
} catch (err) {
  chalk = {
    red: (text) => text,
    yellow: (text) => text,
    white: (text) => text,
    gray: (text) => text,
    cyan: (text) => text,
    bold: { red: (text) => text, white: (text) => text }
  };
  console.warn(err, 'Chalk no está disponible. Usando versión sin color para el manejo de errores.');
}

export interface ErrorMetadata {
  context: string;
  action?: string;
  entityName?: string;
  entityId?: string;
  additionalInfo?: any;
}

/**
 * Maneja errores de forma consistente a través de la aplicación
 * @param error El error original
 * @param metadata Metadatos adicionales para el contexto del error
 * @returns Una excepción de NestJS con formato consistente
 */
export function handleError(error: any, metadata: ErrorMetadata) {
  const logger = new Logger(metadata.context);

  // Extraer datos del error
  const errorMessage = error?.message || 'Error desconocido';
  const statusCode = error?.status || 500;
  const stackLines = error?.stack?.split('\n') || [];

  // Configuración de ancho constante para mejor formato
  const BOX_WIDTH = 80;
  const CONTENT_WIDTH = BOX_WIDTH - 4; // -4 para "║ " al inicio y " ║" al final

  // Función para crear líneas con padding correcto
  const formatLine = (content: string) => {
    return chalk.red('║ ') + content.padEnd(CONTENT_WIDTH) + chalk.red(' ║');
  };

  // Función para dividir texto largo en múltiples líneas
  const wrapText = (text: string, label: string = '', labelColor = chalk.yellow): string[] => {
    const prefix = label ? `${labelColor(label)} ` : '';
    const prefixLength = label.length + 1; // +1 para el espacio después
    const maxContentWidth = CONTENT_WIDTH - prefixLength;

    // Si el texto cabe en una línea, devolverlo
    if (text.length <= maxContentWidth) {
      return [prefix + chalk.white(text.padEnd(maxContentWidth))];
    }

    // Dividir en múltiples líneas
    const lines = [];
    let remainingText = text;

    if (typeof remainingText !== 'string') {
      remainingText = String(remainingText || ''); // Convertir a string o usar cadena vacía
    }

    // Primera línea con el prefijo/etiqueta
    lines.push(prefix + chalk.white(remainingText.substring(0, maxContentWidth).padEnd(maxContentWidth)));
    remainingText = remainingText.substring(maxContentWidth);

    // Líneas adicionales con padding para alinear con el contenido después del prefijo
    while (remainingText.length > 0) {
      const paddingSpaces = ' '.repeat(prefixLength);
      const lineText = remainingText.substring(0, maxContentWidth);
      lines.push(paddingSpaces + chalk.white(lineText.padEnd(maxContentWidth)));
      remainingText = remainingText.substring(maxContentWidth);
    }

    return lines;
  };

  // Renderizar el cuadro de error
  console.error('\n');

  // Cabecera
  console.error(chalk.red('╔' + '═'.repeat(BOX_WIDTH - 2) + '╗'));
  console.error(formatLine(chalk.bold.red('ERROR DETECTADO')));
  console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));

  // Información sobre el error
  wrapText(metadata.context, 'Contexto:  ', chalk.yellow).forEach(line => {
    console.error(formatLine(line));
  });

  if (metadata.action) {
    wrapText(metadata.action, 'Acción:    ', chalk.yellow).forEach(line => {
      console.error(formatLine(line));
    });
  }

  if (metadata.entityName) {
    wrapText(metadata.entityName, 'Entidad:   ', chalk.yellow).forEach(line => {
      console.error(formatLine(line));
    });
  }

  if (metadata.entityId) {
    wrapText(metadata.entityId, 'ID:        ', chalk.yellow).forEach(line => {
      console.error(formatLine(line));
    });
  }

  // Mensaje de error, posiblemente multilinea
  wrapText(errorMessage, 'Mensaje:   ', chalk.yellow).forEach(line => {
    console.error(formatLine(line));
  });

  // Stack trace
  console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));
  console.error(formatLine(chalk.bold.white('Stack Trace (resumido):')));

  stackLines.slice(0, 3).forEach(line => {
    wrapText(line.trim(), '', () => '').forEach(wrappedLine => {
      console.error(formatLine(chalk.gray(wrappedLine)));
    });
  });

  if (stackLines.length > 3) {
    console.error(formatLine(chalk.gray('... y más líneas no mostradas (ver logs detallados)')));
  }

  // Información adicional si existe
  if (metadata.additionalInfo) {
    console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));
    console.error(formatLine(chalk.bold.white('Información adicional:')));

    const infoStr = JSON.stringify(metadata.additionalInfo, null, 2);
    infoStr.split('\n').slice(0, 5).forEach(line => {
      console.error(formatLine(chalk.cyan(line)));
    });

    if (infoStr.split('\n').length > 5) {
      console.error(formatLine(chalk.cyan('... más información no mostrada')));
    }
  }

  console.error(chalk.red('╚' + '═'.repeat(BOX_WIDTH - 2) + '╝'));
  console.error('\n');

  // Registrar usando el logger de NestJS para tener el registro completo
  logger.error({
    message: errorMessage,
    stack: error?.stack,
    context: metadata.context,
    action: metadata.action,
    entityName: metadata.entityName,
    entityId: metadata.entityId,
    additionalInfo: metadata.additionalInfo
  });

  // Devolver la excepción apropiada
  if (error instanceof NotFoundException || statusCode === 404) {
    return error;
  }

  if (error instanceof BadRequestException || statusCode === 400) {
    return error;
  }

  if (error instanceof UnauthorizedException || statusCode === 401) {
    return error;
  }

  if (error instanceof ForbiddenException || statusCode === 403) {
    return error;
  }

  if (error instanceof ConflictException || statusCode === 409) {
    return error;
  }

  return new InternalServerErrorException(
    {
      message: errorMessage,
      context: metadata.context,
      action: metadata.action,
      entityName: metadata.entityName
    },
    'Ha ocurrido un error interno. Por favor, inténtelo de nuevo más tarde.'
  );
}


