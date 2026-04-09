import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

let chalk: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  chalk = require('chalk');
} catch (err) {
  chalk = {
    red: (text: string) => text,
    yellow: (text: string) => text,
    white: (text: string) => text,
    gray: (text: string) => text,
    cyan: (text: string) => text,
    bold: { red: (text: string) => text, white: (text: string) => text },
  };
  // eslint-disable-next-line no-console
  console.warn(err, 'Chalk no está disponible. Usando versión sin color para el manejo de errores.');
}

export interface ErrorMetadata {
  context: string;
  action?: string;
  entityName?: string;
  entityId?: string;
  additionalInfo?: any;
}

export function handleError(error: any, metadata: ErrorMetadata) {
  const logger = new Logger(metadata.context);

  const errorMessage = error?.message || 'Error desconocido';
  const statusCode = error?.status || 500;
  const stackLines = error?.stack?.split('\n') || [];

  const BOX_WIDTH = 80;
  const CONTENT_WIDTH = BOX_WIDTH - 4;

  const formatLine = (content: string) => {
    return chalk.red('║ ') + content.padEnd(CONTENT_WIDTH) + chalk.red(' ║');
  };

  const wrapText = (text: string, label: string = '', labelColor = chalk.yellow): string[] => {
    const prefix = label ? `${labelColor(label)} ` : '';
    const prefixLength = label.length + 1;
    const maxContentWidth = CONTENT_WIDTH - prefixLength;

    if (typeof text !== 'string') {
      text = String(text || '');
    }

    if (text.length <= maxContentWidth) {
      return [prefix + chalk.white(text.padEnd(maxContentWidth))];
    }

    const lines: string[] = [];
    let remainingText = text;

    lines.push(prefix + chalk.white(remainingText.substring(0, maxContentWidth).padEnd(maxContentWidth)));
    remainingText = remainingText.substring(maxContentWidth);

    while (remainingText.length > 0) {
      const paddingSpaces = ' '.repeat(prefixLength);
      const lineText = remainingText.substring(0, maxContentWidth);
      lines.push(paddingSpaces + chalk.white(lineText.padEnd(maxContentWidth)));
      remainingText = remainingText.substring(maxContentWidth);
    }

    return lines;
  };

  // Renderizar el cuadro de error
  // eslint-disable-next-line no-console
  console.error('\n');
  // eslint-disable-next-line no-console
  console.error(chalk.red('╔' + '═'.repeat(BOX_WIDTH - 2) + '╗'));
  // eslint-disable-next-line no-console
  console.error(formatLine(chalk.bold.red('ERROR DETECTADO')));
  // eslint-disable-next-line no-console
  console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));

  wrapText(metadata.context, 'Contexto:  ', chalk.yellow).forEach((line) => {
    // eslint-disable-next-line no-console
    console.error(formatLine(line));
  });

  if (metadata.action) {
    wrapText(metadata.action, 'Acción:    ', chalk.yellow).forEach((line) => {
      // eslint-disable-next-line no-console
      console.error(formatLine(line));
    });
  }

  if (metadata.entityName) {
    wrapText(metadata.entityName, 'Entidad:   ', chalk.yellow).forEach((line) => {
      // eslint-disable-next-line no-console
      console.error(formatLine(line));
    });
  }

  if (metadata.entityId) {
    wrapText(metadata.entityId, 'ID:        ', chalk.yellow).forEach((line) => {
      // eslint-disable-next-line no-console
      console.error(formatLine(line));
    });
  }

  wrapText(errorMessage, 'Mensaje:   ', chalk.yellow).forEach((line) => {
    // eslint-disable-next-line no-console
    console.error(formatLine(line));
  });

  // eslint-disable-next-line no-console
  console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));
  // eslint-disable-next-line no-console
  console.error(formatLine(chalk.bold.white('Stack Trace (resumido):')));

  stackLines.slice(0, 3).forEach((line: string) => {
    wrapText(line.trim(), '', () => '').forEach((wrappedLine) => {
      // eslint-disable-next-line no-console
      console.error(formatLine(chalk.gray(wrappedLine)));
    });
  });

  if (stackLines.length > 3) {
    // eslint-disable-next-line no-console
    console.error(formatLine(chalk.gray('... y más líneas no mostradas (ver logs detallados)')));
  }

  if (metadata.additionalInfo) {
    // eslint-disable-next-line no-console
    console.error(chalk.red('╠' + '═'.repeat(BOX_WIDTH - 2) + '╣'));
    // eslint-disable-next-line no-console
    console.error(formatLine(chalk.bold.white('Información adicional:')));

    const infoStr = JSON.stringify(metadata.additionalInfo, null, 2);
    infoStr
      .split('\n')
      .slice(0, 5)
      .forEach((line) => {
        // eslint-disable-next-line no-console
        console.error(formatLine(chalk.cyan(line)));
      });

    if (infoStr.split('\n').length > 5) {
      // eslint-disable-next-line no-console
      console.error(formatLine(chalk.cyan('... más información no mostrada')));
    }
  }

  // eslint-disable-next-line no-console
  console.error(chalk.red('╚' + '═'.repeat(BOX_WIDTH - 2) + '╝'));
  // eslint-disable-next-line no-console
  console.error('\n');

  logger.error({
    message: errorMessage,
    stack: error?.stack,
    context: metadata.context,
    action: metadata.action,
    entityName: metadata.entityName,
    entityId: metadata.entityId,
    additionalInfo: metadata.additionalInfo,
  });

  if (error instanceof NotFoundException || statusCode === 404) return error;
  if (error instanceof BadRequestException || statusCode === 400) return error;
  if (error instanceof UnauthorizedException || statusCode === 401) return error;
  if (error instanceof ForbiddenException || statusCode === 403) return error;
  if (error instanceof ConflictException || statusCode === 409) return error;

  return new InternalServerErrorException(
    {
      message: errorMessage,
      context: metadata.context,
      action: metadata.action,
      entityName: metadata.entityName,
    },
    'Ha ocurrido un error interno. Por favor, inténtelo de nuevo más tarde.',
  );
}
