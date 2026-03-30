import { IsBoolean, IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from 'nestjs-form-data';

export class CreateUserDTO {
    @IsPhoneNumber("BO")
    @IsString()
    phone: string;

    @IsEmail()
    @IsString()
    email: string;

    @IsString()
    @MinLength(4)
    fullname: string;

    @IsString()
    @MinLength(4)
    lastname: string;

    @IsString()
    @MinLength(4)
    password: string;

    @IsEnum(['m', 'f', 'u'])
    gender: 'm' | 'f' | 'u';

    @IsOptional()
    @IsBoolean()
    is_policy_accepted?: boolean;

    @IsOptional()
    @IsFile()
    @MaxFileSize(1e6)
    @HasMimeType(['image/*'])
    photo?: MemoryStoredFile;
}