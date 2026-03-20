import { IsOptional, IsString, MinLength } from 'class-validator';
import { RegisterUserDTO } from './register-user.dto';

export class CreateUserAdministratorDTO extends RegisterUserDTO {
  @IsString()
  @MinLength(2)
  @IsOptional()
  profession: string;
}
