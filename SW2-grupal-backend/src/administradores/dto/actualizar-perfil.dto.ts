import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ActualizarPerfilAdminDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsEmail()
  @IsOptional()
  correo?: string;
}
