import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RolAdministrador } from '../entities/administrador.entity';

export class CrearAdministradorDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  apellido: string;

  @IsEmail({}, { message: 'El correo debe ser un email válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string;

  @IsEnum(RolAdministrador, { message: 'El rol debe ser SISTEMAS o ELECTORAL.' })
  rol: RolAdministrador;
}
