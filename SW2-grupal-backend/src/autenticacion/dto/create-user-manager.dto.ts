import { IsOptional, IsString, MinLength } from 'class-validator';
import { RegisterUserDTO } from './register-user.dto';

export class CreateUserManagerDTO extends RegisterUserDTO {
  @IsString()
  @MinLength(2)
  @IsOptional()
  responsibility: string;
}
