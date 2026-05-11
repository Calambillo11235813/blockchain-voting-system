import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administrador } from 'src/administradores/entities/administrador.entity';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Administrador)
    private readonly administradorRepository: Repository<Administrador>,
  ) {}

  /**
   * Busca un administrador por correo.
   * @param correo Correo del administrador.
   * @returns Administrador encontrado o null.
   */
  async buscarAdministradorPorCorreo(correo: string): Promise<Administrador | null> {
    const administrador = await this.administradorRepository.findOne({
      where: { correo },
    });

    return administrador;
  }

  /**
   * Cuenta la cantidad total de administradores.
   * @returns Cantidad de administradores.
   */
  async contarAdministradores(): Promise<number> {
    return await this.administradorRepository.count();
  }

  /**
   * Crea un administrador.
   * @param correo Correo del administrador.
   * @param passwordHash Contraseña hasheada.
   * @returns Administrador creado.
   */
  async crearAdministrador(correo: string, passwordHash: string): Promise<Administrador> {
    const administrador = this.administradorRepository.create({
      correo,
      password: passwordHash,
    });

    return await this.administradorRepository.save(administrador);
  }
}
