import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  registro: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  eleccionId?: string;
}
