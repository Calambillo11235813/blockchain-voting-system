import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarPasswordAdminDto {
  @IsString()
  @IsNotEmpty()
  passwordActual: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  passwordNuevo: string;
}
