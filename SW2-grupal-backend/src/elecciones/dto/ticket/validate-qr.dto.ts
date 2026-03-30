import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateQrDto {
    @IsNotEmpty()
    @IsString()
    qrImageData: string; // Contenido del QR escaneado
}