import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  registro: string;

  @IsString()
  @IsNotEmpty()
  password: string;

}
