import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';

import { Eleccion } from 'src/elecciones/entities/eleccion.entity';
import { RegistroSufragio } from 'src/elecciones/entities/registro-sufragio.entity';
import { Elector } from 'src/electores/entities/elector.entity';

@Injectable()
export class CertificadoService {
  constructor(
    @InjectRepository(Eleccion)
    private readonly eleccionRepository: Repository<Eleccion>,

    @InjectRepository(RegistroSufragio)
    private readonly registroSufragioRepository: Repository<RegistroSufragio>,

    @InjectRepository(Elector)
    private readonly electorRepository: Repository<Elector>,
  ) {}

  /**
   * Genera el Certificado de Sufragio en formato PDF (A4) para un elector y elección específicos.
   * Valida la existencia del comicio y el sufragio del elector.
   *
   * @param eleccionId UUID de la elección.
   * @param electorId UUID del elector.
   * @returns Buffer binario del PDF generado.
   */
  async generarCertificadoPDF(eleccionId: string, electorId: string): Promise<Buffer> {
    // 1. Validar que la elección exista
    const eleccion = await this.eleccionRepository.findOne({ where: { id: eleccionId } });
    if (!eleccion) {
      throw new NotFoundException(`No se encontró la elección con ID ${eleccionId}.`);
    }

    // 2. Validar que la jornada esté cerrada o permitir si está activa bajo bypass
    const bypass = process.env.BYPASS_ELECTION_TIME === 'true';
    if (eleccion.estaActiva && !bypass) {
      console.log('CertificadoService: ForbiddenException -> La jornada electoral sigue activa.');
      throw new ForbiddenException('La jornada electoral sigue activa. El certificado estará disponible una vez cerrada la jornada.');
    }

    // 3. Verificar que el elector haya sufragado en esta elección
    const registro = await this.registroSufragioRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: electorId },
      },
      relations: ['elector', 'eleccion'],
    });

    if (!registro) {
      throw new ForbiddenException('El elector no ha emitido su voto en esta elección.');
    }

    const elector = registro.elector;

    // 4. Generar Código QR en memoria
    // Codifica una URL oficial de verificación de firmas y sufragio.
    const urlVerificacion = `https://corte-electoral.uagrm.edu.bo/verificar-sufragio?hash=${registro.hashTransaccion}`;
    let qrDataUrl: string;
    try {
      qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
        margin: 1,
        width: 250,
        errorCorrectionLevel: 'H',
      });
    } catch (err: any) {
      throw new ForbiddenException(`Error al generar el código QR de verificación: ${err.message || err}`);
    }

    // 5. Generar Documento PDF utilizando pdf-lib
    const pdfDoc = await PDFDocument.create();
    
    // Tamaño A4 estándar en puntos (595.276 x 841.890)
    const page = pdfDoc.addPage([595.276, 841.890]);
    const { width, height } = page.getSize();

    // Paleta de Colores sleeks (Azul Institucional y Dorado Elegante)
    const colorAzulInstitucional = rgb(0.08, 0.22, 0.44); // HSL adaptado
    const colorDoradoAccent = rgb(0.76, 0.58, 0.20);
    const colorTextoGris = rgb(0.2, 0.2, 0.2);
    const colorFondoCaja = rgb(0.96, 0.97, 0.98);

    // Tipografías Estándar
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
    const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Dibuja Bordes Elegantes A4
    // Borde exterior azul
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: colorAzulInstitucional,
      borderWidth: 2,
    });
    // Borde interior dorado
    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: colorDoradoAccent,
      borderWidth: 1,
    });

    // --- CABECERA ---
    const textUagrm = 'UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO';
    const textCeu = 'CORTE ELECTORAL UNIVERSITARIA';
    const textCertificado = 'CERTIFICADO DE SUFRAGIO';

    page.drawText(textUagrm, {
      x: width / 2 - fontHelveticaBold.widthOfTextAtSize(textUagrm, 13) / 2,
      y: height - 60,
      size: 13,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    page.drawText(textCeu, {
      x: width / 2 - fontHelvetica.widthOfTextAtSize(textCeu, 10) / 2,
      y: height - 76,
      size: 10,
      font: fontHelvetica,
      color: colorTextoGris,
    });

    // Línea divisoria superior
    page.drawLine({
      start: { x: 50, y: height - 90 },
      end: { x: width - 50, y: height - 90 },
      color: colorDoradoAccent,
      thickness: 1.5,
    });

    // Título Principal "CERTIFICADO DE SUFRAGIO"
    page.drawText(textCertificado, {
      x: width / 2 - fontHelveticaBold.widthOfTextAtSize(textCertificado, 22) / 2,
      y: height - 130,
      size: 22,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    const textAcreditacion = 'La Corte Electoral Universitaria de la U.A.G.R.M. hace constar que el siguiente ciudadano emitió su voto de manera libre, secreta y democrática en la jornada electoral descrita a continuación, quedando su registro de participación resguardado de forma inmutable.';
    // Párrafo de acreditación (con control de línea para evitar desbordes)
    let currentY = height - 165;
    const margin = 50;
    const maxWidth = width - 100;

    const words = textAcreditacion.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontHelvetica.widthOfTextAtSize(testLine, 9.5);
      if (testWidth > maxWidth) {
        page.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: 9.5,
          font: fontHelvetica,
          color: colorTextoGris,
        });
        currentLine = word;
        currentY -= 14;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: 9.5,
        font: fontHelvetica,
        color: colorTextoGris,
      });
      currentY -= 14;
    }

    currentY -= 15;

    // --- SECCIÓN 1: DATOS PERSONALES DEL ELECTOR ---
    page.drawText('I. DATOS DEL ELECTOR', {
      x: margin,
      y: currentY,
      size: 11,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    currentY -= 6;

    // Caja para Datos Personales
    const boxHeight = 110;
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeight,
      width: maxWidth,
      height: boxHeight,
      color: colorFondoCaja,
      borderColor: rgb(0.85, 0.87, 0.90),
      borderWidth: 1,
    });

    let textY = currentY - 22;
    const rowOffset = 18;

    const drawLabelValue = (label: string, value: string, yPos: number) => {
      page.drawText(label, { x: margin + 15, y: yPos, size: 9.5, font: fontHelveticaBold, color: colorAzulInstitucional });
      page.drawText(value, { x: margin + 180, y: yPos, size: 9.5, font: fontHelvetica, color: colorTextoGris });
    };

    drawLabelValue('NOMBRES Y APELLIDOS:', `${elector.nombre} ${elector.apellido}`.toUpperCase(), textY);
    textY -= rowOffset;
    drawLabelValue('CÉDULA DE IDENTIDAD:', elector.ci, textY);
    textY -= rowOffset;
    drawLabelValue('REGISTRO UNIVERSITARIO:', elector.registro, textY);
    textY -= rowOffset;
    drawLabelValue('ESTAMENTO ACADÉMICO:', elector.estamento, textY);
    textY -= rowOffset;
    drawLabelValue('CARRERA / FACULTAD:', elector.carrera.toUpperCase(), textY);

    currentY -= (boxHeight + 25);

    // --- SECCIÓN 2: DATOS DE LA JORNADA ELECTORAL ---
    page.drawText('II. DETALLES DE LA ELECCIÓN', {
      x: margin,
      y: currentY,
      size: 11,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    currentY -= 6;

    const boxHeight2 = 70;
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeight2,
      width: maxWidth,
      height: boxHeight2,
      color: colorFondoCaja,
      borderColor: rgb(0.85, 0.87, 0.90),
      borderWidth: 1,
    });

    let textY2 = currentY - 22;
    
    // Formatear Fecha
    const fecha = new Date(eleccion.fecha);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const fechaEspanol = fecha.toLocaleDateString('es-ES', options);

    drawLabelValue('PROCESO ELECTORAL:', eleccion.titulo.toUpperCase(), textY2);
    textY2 -= rowOffset;
    drawLabelValue('GESTIÓN ACADÉMICA:', String(eleccion.gestion), textY2);
    textY2 -= rowOffset;
    drawLabelValue('FECHA DE SUFRAGIO:', fechaEspanol, textY2);

    currentY -= (boxHeight2 + 25);

    // --- SECCIÓN 3: COMPROBANTE CRIPTOGRÁFICO BLOCKCHAIN ---
    page.drawText('III. COMPROBACIÓN CRIPTOGRÁFICA INMUTABLE', {
      x: margin,
      y: currentY,
      size: 11,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    currentY -= 6;

    const boxHeight3 = 60;
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeight3,
      width: maxWidth,
      height: boxHeight3,
      color: colorFondoCaja,
      borderColor: rgb(0.85, 0.87, 0.90),
      borderWidth: 1,
    });

    // Hash de transacción en Courier (Monospace)
    page.drawText('CÓDIGO HASH DE TRANSACCIÓN (TXHASH):', {
      x: margin + 15,
      y: currentY - 18,
      size: 8,
      font: fontHelveticaBold,
      color: colorDoradoAccent,
    });

    // Mostrar el hash completo de forma legible
    page.drawText(registro.hashTransaccion, {
      x: margin + 15,
      y: currentY - 36,
      size: 8,
      font: fontCourierBold,
      color: colorAzulInstitucional,
    });

    page.drawText('Este hash confirma en la red blockchain la validez e inmutabilidad del sufragio de forma anónima.', {
      x: margin + 15,
      y: currentY - 48,
      size: 7,
      font: fontHelvetica,
      color: colorTextoGris,
    });

    currentY -= (boxHeight3 + 20);

    // --- SECCIÓN 4: CÓDIGO QR Y SELLOS DE VALIDEZ ---
    // Embeber Imagen del QR
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    const qrSize = 100;
    const qrX = width / 2 - qrSize / 2;
    page.drawImage(qrImage, {
      x: qrX,
      y: currentY - qrSize - 10,
      width: qrSize,
      height: qrSize,
    });

    const qrText = 'Escanee el código QR para verificar la validez de este certificado directamente en la plataforma oficial de la CEU.';
    page.drawText(qrText, {
      x: width / 2 - fontHelvetica.widthOfTextAtSize(qrText, 7.5) / 2,
      y: currentY - qrSize - 23,
      size: 7.5,
      font: fontHelvetica,
      color: colorTextoGris,
    });

    // Sello y firma digital simulada
    const firmaY = 70;
    
    // Línea de firma
    page.drawLine({
      start: { x: width / 2 - 100, y: firmaY + 15 },
      end: { x: width / 2 + 100, y: firmaY + 15 },
      color: colorAzulInstitucional,
      thickness: 1,
    });

    const textFirmaCeu = 'FIRMA AUTORIZADA Y SELLO DIGITAL';
    const textFirmaCeu2 = 'CORTE ELECTORAL UNIVERSITARIA — U.A.G.R.M.';
    
    page.drawText(textFirmaCeu, {
      x: width / 2 - fontHelveticaBold.widthOfTextAtSize(textFirmaCeu, 8) / 2,
      y: firmaY,
      size: 8,
      font: fontHelveticaBold,
      color: colorAzulInstitucional,
    });

    page.drawText(textFirmaCeu2, {
      x: width / 2 - fontHelvetica.widthOfTextAtSize(textFirmaCeu2, 7) / 2,
      y: firmaY - 10,
      size: 7,
      font: fontHelvetica,
      color: colorTextoGris,
    });

    // Fecha y hora de emisión del certificado en el pie de página
    const fechaEmision = new Date();
    const formattedEmision = fechaEmision.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    
    const textPie = `Documento emitido de forma digital y segura el: ${formattedEmision} | Resguardo Criptográfico UAGRM`;
    page.drawText(textPie, {
      x: width / 2 - fontHelvetica.widthOfTextAtSize(textPie, 7) / 2,
      y: 35,
      size: 7,
      font: fontHelvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 6. Guardar y retornar el PDF como Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Verifica si un elector ya ha emitido su voto en una elección específica.
   */
  async verificarSiVoto(eleccionId: string, electorId: string): Promise<{ haVotado: boolean; txHash?: string }> {
    const registro = await this.registroSufragioRepository.findOne({
      where: {
        eleccion: { id: eleccionId },
        elector: { id: electorId },
      },
    });
    return {
      haVotado: !!registro,
      txHash: registro?.hashTransaccion,
    };
  }
}
