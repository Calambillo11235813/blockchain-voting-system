// src/aws/services/aws.service.ts

import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import * as fs from 'fs/promises';
import { join } from 'path';
import { TenantService } from 'src/tenant/services/tenant.service';

@Injectable()
export class AwsService {
    private readonly rekognitionClient: RekognitionClient;
    private readonly textractClient: TextractClient;
    private readonly tempDir = join('./temp');

    constructor(
        private readonly configService: ConfigService,
        private readonly tenantService: TenantService,
    ) {
        this.rekognitionClient = new RekognitionClient({
            region: this.configService.get<string>('aws_region'),
            credentials: {
                accessKeyId: this.configService.get<string>('aws_access_key_id'),
                secretAccessKey: this.configService.get<string>('aws_secret_access_key'),
            },
        });

        this.textractClient = new TextractClient({
            region: this.configService.get<string>('aws_region'),
            credentials: {
                accessKeyId: this.configService.get<string>('aws_access_key_id_textract'),
                secretAccessKey: this.configService.get<string>('aws_secret_access_key_textract'),
            },
        });

        this.initializeTempDir();
    }

    /**
     * Inicializa el directorio temporal.
     */
    private async initializeTempDir(): Promise<void> {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Error al crear el directorio temporal:', error.message);
        }
    }


    /**
     * Extrae texto de un documento utilizando AWS Textract.
     * @param documentBuffer - Buffer del documento.
     * @returns Lista de líneas extraídas.
     */
    async extractTextFromDocument(documentBuffer: Buffer): Promise<string[]> {
        try {
            // Asegúrate de que el textractClient está correctamente inicializado
            if (!this.textractClient) {
                throw new Error('TextractClient no inicializado');
            }

            const command = new DetectDocumentTextCommand({
                Document: { Bytes: documentBuffer },
            });

            const result = await this.textractClient.send(command);

            // Verifica que result.Blocks exista y sea un array
            if (!result || !result.Blocks || !Array.isArray(result.Blocks)) {
                return [];
            }

            return result.Blocks
                .filter(block => block && block.BlockType === 'LINE')
                .map(block => block.Text || '');
        } catch (error) {
            console.error('Error al extraer texto con Textract:', error);
            throw new InternalServerErrorException(
                'Error al extraer texto del documento',
                error instanceof Error ? error.message : 'Error desconocido'
            );
        }
    }


    /**
     * Compara las caras del documento con una selfie.
     * @param userId - ID del usuario.
     * @param tenantId - ID del tenant.
     * @param frontBuffer - Buffer del anverso del documento.
     * @param selfieBuffer - Buffer de la selfie.
     * @returns `true` si las caras coinciden; `false` de lo contrario.
     */
    async compareFace(
        userId: string,
        tenantId: string,
        documentBuffer: Buffer,
        selfieBuffer: Buffer,
    ): Promise<boolean> {
        try {
            await this.validateUserMembership(userId, tenantId);
            return await this.compareFacesBuffer(documentBuffer, selfieBuffer);
        } catch (error) {
            throw new InternalServerErrorException('Error al comparar las fotos del documento con la selfie, intenta de nuevo', error);
        }
    }

    /**
     * Compara las caras del documento con una selfie usando ambos lados del documento.
     * @param userId - ID del usuario.
     * @param tenantId - ID del tenant.
     * @param frontBuffer - Buffer del anverso del documento.
     * @param backBuffer - Buffer del reverso del documento.
     * @param selfieBuffer - Buffer de la selfie.
     * @returns `true` si las caras coinciden; `false` de lo contrario.
     */
    async compareFacesWithDocument(
        userId: string,
        tenantId: string,
        frontBuffer: Buffer,
        backBuffer: Buffer,
        selfieBuffer: Buffer,
    ): Promise<boolean> {
        try {
            await this.validateUserMembership(userId, tenantId);
            const frontMatch = await this.compareFacesBuffer(frontBuffer, selfieBuffer);
            if (!frontMatch) {
                const backMatch = await this.compareFacesBuffer(backBuffer, selfieBuffer);
                return backMatch;
            }
            return frontMatch;
        } catch (error) {
            throw new InternalServerErrorException('Error al comparar las fotos del documento con la selfie, intenta de nuevo', error);
        }
    }

    /**
     * Compara dos imágenes utilizando AWS Rekognition.
     * @param sourceBuffer - Buffer de la imagen de origen.
     * @param targetBuffer - Buffer de la imagen de destino.
     * @returns `true` si las caras coinciden; `false` de lo contrario.
     */
    private async compareFacesBuffer(sourceBuffer: Buffer, targetBuffer: Buffer): Promise<boolean> {
        try {
            const command = new CompareFacesCommand({
                SourceImage: { Bytes: sourceBuffer },
                TargetImage: { Bytes: targetBuffer },
                SimilarityThreshold: 80,
            });

            const result = await this.rekognitionClient.send(command);

            return result.FaceMatches && result.FaceMatches.length > 0;
        } catch (error) {
            throw new InternalServerErrorException('Error al comparar las fotos', error);
        }
    }

    /**
     * Valida si el usuario es miembro del tenant.
     * @param userId ID del usuario.
     * @param tenantId ID del tenant.
     * @throws UnauthorizedException
     */
    private async validateUserMembership(userId: string, tenantId: string): Promise<void> {
        const isMember = await this.tenantService.isUserMemberOfTenant(userId, tenantId);
        if (!isMember) {
            throw new UnauthorizedException('No tienes permiso para acceder a este tenant.');
        }
    }
}