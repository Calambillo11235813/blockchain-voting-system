import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { handleError } from 'src/compartido/manejo-errores';
import { ApiResponse } from 'src/compartido/respuesta';

@Injectable()
export class SeedService {

  constructor() { }

  async seed(): Promise<ApiResponse<null>> {
    return {
      statusCode: HttpStatus.OK,
      message: 'Seed skipped: Role/Permission entities removed',
      data: null,
    };
  }

}
