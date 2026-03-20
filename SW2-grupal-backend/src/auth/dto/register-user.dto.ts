import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterUserDTO {
  @IsString()
  @MinLength(2)
  fullname: string;

  @IsString()
  @MinLength(2)
  lastname: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password must have a Uppercase, lowercase, letter and a number',
  })
  password: string;

  @IsString()
  @MinLength(6)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'The password must have a Uppercase, lowercase, letter and a number',
  })
  passwordConfirm: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  phone: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  codeCountry: number;

  @IsString()
  @MinLength(2)
  country: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  photoUrl: string;

  @IsEnum(['m', 'f', 'u'], { message: 'Gender must be one of: m, f, u' })
  gender: string;
}
