import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFacultyDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    location?: string;

}