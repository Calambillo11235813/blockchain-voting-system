import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminsService } from 'src/administradores/admins.service';
import { RolAdministrador } from 'src/administradores/entities/administrador.entity';

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
   * Si el administrador por defecto ya existe pero tiene un rol incorrecto, lo corrige.
   * @returns void.
   */
  async crearAdministradorPorDefectoSiNoExiste(): Promise<void> {
    try {
      const correoDefault = 'admin@uagrm.edu.bo';
      const adminExistente = await this.adminsService.buscarAdministradorPorCorreo(correoDefault);

      if (adminExistente) {
        // Corregir el rol si fue creado con el rol equivocado (ELECTORAL por defecto de la entidad)
        if (adminExistente.rol !== RolAdministrador.SISTEMAS) {
          await this.adminsService.corregirRolAdministrador(adminExistente.id, RolAdministrador.SISTEMAS);
          this.logger.warn(`Rol del administrador por defecto corregido: ${adminExistente.rol} → SISTEMAS`);
        } else {
          this.logger.log('Administrador por defecto ya existe con rol SISTEMAS. Nada que hacer.');
        }
        return;
      }

      const nombre = 'Administrador';
      const apellido = 'Sistema';
      const passwordPlano = 'Admin123!';
      const passwordHash = await bcrypt.hash(passwordPlano, 10);

      await this.adminsService.crearAdministrador(nombre, apellido, correoDefault, passwordHash, RolAdministrador.SISTEMAS);
      this.logger.log('Administrador por defecto creado con rol SISTEMAS');
    } catch (error) {
      this.logger.error('No se pudo crear el administrador por defecto', error instanceof Error ? error.stack : undefined);
    }
  }
}
