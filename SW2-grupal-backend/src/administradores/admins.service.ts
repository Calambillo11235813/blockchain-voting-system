import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administrador, RolAdministrador } from 'src/administradores/entities/administrador.entity';
import { ActualizarPerfilAdminDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordAdminDto } from './dto/cambiar-password.dto';
import { CrearAdministradorDto } from './dto/crear-administrador.dto';
import * as bcrypt from 'bcrypt';

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
   * @param nombre Nombre del administrador.
   * @param apellido Apellido del administrador.
   * @param correo Correo del administrador.
   * @param passwordHash Contraseña hasheada.
   * @param rol Rol del administrador.
   * @returns Administrador creado.
   */
  async crearAdministrador(
    nombre: string,
    apellido: string,
    correo: string,
    passwordHash: string,
    rol: RolAdministrador = RolAdministrador.ELECTORAL,
  ): Promise<Administrador> {
    const administrador = this.administradorRepository.create({
      nombre,
      apellido,
      correo,
      password: passwordHash,
      rol,
    });

    return await this.administradorRepository.save(administrador);
  }

  /**
   * Crea un administrador desde el DTO, validando correo y hasheando password.
   */
  async crearAdministradorDesdeDto(dto: CrearAdministradorDto): Promise<Omit<Administrador, 'password'>> {
    const existe = await this.buscarAdministradorPorCorreo(dto.correo);
    if (existe) {
      throw new ConflictException('El correo electrónico ya está en uso por otro administrador.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = await this.crearAdministrador(dto.nombre, dto.apellido, dto.correo, passwordHash, dto.rol);
    
    const { password, ...perfil } = admin;
    return perfil;
  }

  /**
   * Corrige el rol de un administrador existente.
   * Usado por el seed para reparar el administrador por defecto si fue creado con rol incorrecto.
   * @param id UUID del administrador.
   * @param rol Rol correcto a asignar.
   */
  async corregirRolAdministrador(id: string, rol: RolAdministrador): Promise<void> {
    await this.administradorRepository.update({ id }, { rol });
  }

  /**
   * Obtiene el perfil de un administrador excluyendo su contraseña.
   * @param adminId UUID del administrador.
   * @returns Administrador sin contraseña.
   * @throws NotFoundException si no existe.
   */
  async obtenerPerfil(adminId: string): Promise<Omit<Administrador, 'password'>> {
    const admin = await this.administradorRepository.findOne({
      where: { id: adminId },
      select: ['id', 'nombre', 'apellido', 'correo', 'rol'],
    });

    if (!admin) {
      throw new NotFoundException('Administrador no encontrado');
    }

    return admin;
  }

  /**
   * Actualiza el perfil de un administrador.
   * @param adminId UUID del administrador.
   * @param dto Datos a actualizar.
   * @returns Perfil actualizado sin contraseña.
   * @throws NotFoundException si no existe.
   * @throws ConflictException si el correo nuevo ya está en uso.
   */
  async actualizarPerfil(
    adminId: string,
    dto: ActualizarPerfilAdminDto,
  ): Promise<Omit<Administrador, 'password'>> {
    const admin = await this.administradorRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrador no encontrado');
    }

    if (dto.correo && dto.correo !== admin.correo) {
      const existeCorreo = await this.buscarAdministradorPorCorreo(dto.correo);
      if (existeCorreo) {
        throw new ConflictException('El correo electrónico ya está en uso por otro administrador.');
      }
      admin.correo = dto.correo;
    }

    if (dto.nombre !== undefined) admin.nombre = dto.nombre;
    if (dto.apellido !== undefined) admin.apellido = dto.apellido;

    await this.administradorRepository.save(admin);

    // Retornar perfil actualizado excluyendo contraseña
    const { password, ...perfil } = admin;
    return perfil;
  }

  /**
   * Cambia la contraseña de un administrador verificando la contraseña actual.
   * @param adminId UUID del administrador.
   * @param dto Datos del cambio de contraseña.
   * @throws NotFoundException si no existe.
   * @throws UnauthorizedException si la contraseña actual no es correcta.
   */
  async cambiarPassword(
    adminId: string,
    dto: CambiarPasswordAdminDto,
  ): Promise<void> {
    const admin = await this.administradorRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrador no encontrado');
    }

    const passwordOk = await bcrypt.compare(String(dto.passwordActual || ''), admin.password);
    if (!passwordOk) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    admin.password = await bcrypt.hash(dto.passwordNuevo, 10);
    await this.administradorRepository.save(admin);
  }

  /**
   * Lista todos los administradores registrados excluyendo contraseñas.
   * @returns Lista de administradores.
   */
  async listarAdministradores(): Promise<Omit<Administrador, 'password'>[]> {
    return await this.administradorRepository.find({
      select: ['id', 'nombre', 'apellido', 'correo', 'rol'],
    });
  }

  /**
   * Elimina físicamente a un administrador del sistema por su ID.
   * @param id UUID del administrador a eliminar.
   * @throws NotFoundException si no existe.
   */
  async eliminarAdministrador(id: string): Promise<void> {
    const admin = await this.administradorRepository.findOne({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException('Administrador no encontrado');
    }

    await this.administradorRepository.remove(admin);
  }
}
