import { Controller, Get, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CertificadoService } from '../services/certificado.service';
import { JwtAuthGuard } from 'src/autenticacion/guards/jwt-auth.guard';

/**
 * Controlador para la emisión de certificados de sufragio.
 * Todos los endpoints requieren autenticación mediante JWT.
 */
@Controller('elecciones/certificado')
@UseGuards(JwtAuthGuard)
export class CertificadoController {
  constructor(private readonly certificadoService: CertificadoService) {}

  /**
   * Genera y descarga el certificado de sufragio para la elección especificada.
   * Solo accesible para el elector autenticado correspondiente.
   *
   * @param eleccionId UUID de la elección.
   * @param req Objeto de solicitud conteniendo el elector autenticado.
   * @param res Objeto de respuesta Express.
   */
  @Get(':eleccionId')
  async descargarCertificado(
    @Param('eleccionId', ParseUUIDPipe) eleccionId: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const electorId = req.user.id;
    
    // Generar el buffer del PDF en memoria
    const pdfBuffer = await this.certificadoService.generarCertificadoPDF(eleccionId, electorId);
    
    const shortElector = electorId.substring(0, 8);
    
    // Configurar cabeceras HTTP de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado_sufragio_${shortElector}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el stream binario
    res.end(pdfBuffer);
  }
}
