import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ElectoresService } from './electores.service';
import { ApiResponse, createApiResponse } from '../compartido/respuesta';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly electoresService: ElectoresService) {}

  @Get('total')
  async obtenerTotalEstudiantes(): Promise<ApiResponse<{ total: number }>> {
    const total = await this.electoresService.contarEstudiantes();
    return createApiResponse(HttpStatus.OK, { total }, 'Total de estudiantes calculado exitosamente.');
  }
}
