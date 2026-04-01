import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import ticketValidatorAbi from '../abis/contracts/TicketValidator.json';

@Injectable()
export class TicketValidatorContractService {
    private readonly hardhatMicroserviceUrl: string;
    private readonly provider?: ethers.JsonRpcProvider;
    private readonly wallet?: ethers.Wallet;
    private readonly enabled: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.hardhatMicroserviceUrl = this.configService.get<string>('hardhat_microservice_url');
        this.enabled = Boolean(this.configService.get<boolean>('enable_blockchain'));

        if (!this.enabled) {
            return;
        }

        const providerUrl = this.configService.get<string>('blockchain_url');
        const privateKeyRaw = this.configService.get<string>('wallet_private_key');
        if (!providerUrl || !privateKeyRaw) {
            throw new ServiceUnavailableException('Blockchain is enabled but missing BLOCKCHAIN_URL or WALLET_PRIVATE_KEY');
        }

        const trimmedKey = privateKeyRaw.trim();
        const normalizedPrivateKey = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.wallet = new ethers.Wallet(normalizedPrivateKey, this.provider);
    }

    private assertEnabled(): void {
        if (!this.enabled) {
            throw new ServiceUnavailableException('Blockchain integration is disabled. Set ENABLE_BLOCKCHAIN=true to enable it.');
        }
        if (!this.wallet) {
            throw new ServiceUnavailableException('Blockchain wallet is not initialized. Check BLOCKCHAIN_URL and WALLET_PRIVATE_KEY.');
        }
    }

    private getContractConfig() {
        this.assertEnabled();
        const contractAddress = this.configService.get<string>('ticket_validator_address');
        if (!contractAddress) {
            throw new BadRequestException('ticket_validator_address is not configured');
        }

        return {
            contractAddress,
            tenantId: this.configService.get<string>('ticket_validator_tenant_id') || 'default',
            tenantName: this.configService.get<string>('ticket_validator_tenant_name') || 'Default',
        };
    }

    async deployTicketValidatorContract(): Promise<{ contractAddress: string }> {
        this.assertEnabled();
        if (!this.hardhatMicroserviceUrl) {
            throw new ServiceUnavailableException('HARDHAT_MICROSERVICE_URL is not configured');
        }
        try {
            // Paso 1: Desplegar el contrato
            const response = await firstValueFrom(
                this.httpService.post(`${this.hardhatMicroserviceUrl}/deploy-ticket-validator-contract`),
            );

            const { contractTicketValidator } = response.data;

            if (!contractTicketValidator) {
                throw new Error('No se pudo obtener la dirección del contrato de TicketValidator');
            }

            console.log("Direccion del contrato de TicketValidator:", contractTicketValidator);

            return { contractAddress: contractTicketValidator };
        } catch (error) {
            console.error("Error completo:", error);
            throw new BadRequestException(`Error al desplegar el contrato de TicketValidator: ${error.message}`);
        }
    }

    /**
     * Registra la validación de un ticket en la blockchain
     * @param ticketId - ID del ticket.
     * @param purchaseId - ID de la compra.
     * @param validatorId - ID del usuario que valida.
     * @param eventId - ID del evento.
     * @param sectionName - Nombre de la sección.
     * @returns Hash de la validación.
     */
    async registerTicketValidation(
        ticketId: string,
        purchaseId: string,
        validatorId: string,
        eventId: string,
        sectionName: string,
    ) {
        this.assertEnabled();
        const { contractAddress, tenantId, tenantName } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            // Llamar al método registerValidation del contrato
            const tx = await ticketContract.registerValidation(
                ticketId,
                purchaseId,
                validatorId,
                eventId,
                sectionName || 'Sin sección',
                tenantId,
                tenantName
            );

            const receipt = await tx.wait();

            // Buscar el evento de validación para obtener el hash
            const validationEvent = receipt.events?.find(e => e.event === 'TicketValidated');
            const validationHash = validationEvent ? validationEvent.args.validationHash : null;

            return {
                success: true,
                txHash: receipt.transactionHash,
                validationHash,
                ticketId,
                validatorId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new BadRequestException(`Error al registrar la validación del ticket: ${error.message}`);
        }
    }

    /**
     * Verifica si un ticket ha sido validado
     * @param ticketId - ID del ticket a verificar.
     * @returns Información de validación del ticket.
     */
    async verifyTicket(ticketId: string) {
        this.assertEnabled();
        if (!ticketId) {
            throw new BadRequestException('El parámetro "ticketId" es requerido.');
        }
        const { contractAddress } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            const [isValidated, record] = await ticketContract.verifyTicket(ticketId);

            if (!isValidated) {
                return {
                    isValidated: false,
                    message: 'El ticket no ha sido validado en blockchain.'
                };
            }

            return {
                isValidated: true,
                ticketId: record.ticketId,
                purchaseId: record.purchaseId,
                validatorId: record.validatorId,
                validatedAt: new Date(Number(record.validatedAt) * 1000).toISOString(),
                eventId: record.eventId,
                sectionName: record.sectionName,
                tenantId: record.tenantId,
                tenantName: record.tenantName,
                validationHash: record.validationHash
            };
        } catch (error) {
            throw new BadRequestException(`Error al verificar el ticket: ${error.message}`);
        }
    }

    /**
     * Verifica un hash de validación
     * @param validationHash - Hash a verificar.
     * @returns Información asociada al hash.
     */
    async verifyValidationHash(validationHash: string) {
        this.assertEnabled();
        if (!validationHash) {
            throw new BadRequestException('El parámetro "validationHash" es requerido.');
        }
        const { contractAddress } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            const [isValid, record] = await ticketContract.verifyValidationHash(validationHash);

            if (!isValid) {
                return {
                    isValid: false,
                    message: 'Hash de validación no encontrado o inválido.'
                };
            }

            return {
                isValid: true,
                ticketId: record.ticketId,
                purchaseId: record.purchaseId,
                validatorId: record.validatorId,
                validatedAt: new Date(Number(record.validatedAt) * 1000).toISOString(),
                eventId: record.eventId,
                sectionName: record.sectionName,
                tenantId: record.tenantId,
                tenantName: record.tenantName
            };
        } catch (error) {
            throw new BadRequestException(`Error al verificar el hash de validación: ${error.message}`);
        }
    }

    /**
     * Obtiene estadísticas de validación del sistema
     * @returns Estadísticas generales.
     */
    async getTenantStats() {
        this.assertEnabled();
        const { contractAddress, tenantId } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            const count = await ticketContract.getTenantStats(tenantId);

            return {
                tenantId,
                validationsCount: Number(count)
            };
        } catch (error) {
            throw new BadRequestException(`Error al obtener estadísticas del tenant: ${error.message}`);
        }
    }

    /**
     * Obtiene estadísticas de validación por evento
     * @param eventId - ID del evento.
     * @returns Estadísticas del evento.
     */
    async getEventStats(eventId: string) {
        this.assertEnabled();
        if (!eventId) {
            throw new BadRequestException('El parámetro "eventId" es requerido.');
        }
        const { contractAddress } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            const count = await ticketContract.getEventStats(eventId);

            return {
                eventId,
                validationsCount: Number(count)
            };
        } catch (error) {
            throw new BadRequestException(`Error al obtener estadísticas del evento: ${error.message}`);
        }
    }

    /**
     * Obtiene estadísticas de validación por validador
     * @param validatorId - ID del validador.
     * @returns Estadísticas del validador.
     */
    async getValidatorStats(validatorId: string) {
        this.assertEnabled();
        if (!validatorId) {
            throw new BadRequestException('El parámetro "validatorId" es requerido.');
        }
        const { contractAddress } = this.getContractConfig();
        const ticketContract = new ethers.Contract(contractAddress, ticketValidatorAbi.abi, this.wallet);

        try {
            const count = await ticketContract.getValidatorStats(validatorId);

            return {
                validatorId,
                validationsCount: Number(count)
            };
        } catch (error) {
            throw new BadRequestException(`Error al obtener estadísticas del validador: ${error.message}`);
        }
    }
}