import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminsService } from 'src/admins/admins.service';

@Injectable()
export class AdministradorInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdministradorInitService.name);

  constructor(private readonly adminsService: AdminsService) {}

  /**
   * Inicializa datos requeridos al levantar la aplicación.
   * @returns void.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.crearAdministradorPorDefectoSiNoExiste();
  }

  /**
   * Crea un administrador por defecto si la tabla de administradores está vacía.
   * @returns void.
   */
  async crearAdministradorPorDefectoSiNoExiste(): Promise<void> {
    try {
      const cantidad = await this.adminsService.contarAdministradores();

      if (cantidad > 0) {
        return;
      }

      const correo = 'admin@uagrm.edu.bo';
      const passwordPlano = 'Admin123!';
      const passwordHash = await bcrypt.hash(passwordPlano, 10);

      await this.adminsService.crearAdministrador(correo, passwordHash);
      this.logger.log('Administrador por defecto creado');
    } catch (error) {
      this.logger.error('No se pudo crear el administrador por defecto', error instanceof Error ? error.stack : undefined);
    }
  }
}
