import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';

/**
 * Proveedor para configurar e inicializar Cloudinary.
 */
export const CloudinaryProvider: Provider = {
    provide: 'Cloudinary',
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        cloudinary.config({
            cloud_name: configService.get<string>('cloudinary_cloud_name'),
            api_key: configService.get<string>('cloudinary_api_key'),
            api_secret: configService.get<string>('cloudinary_api_secret'),
        });
        return cloudinary;
    },
};
