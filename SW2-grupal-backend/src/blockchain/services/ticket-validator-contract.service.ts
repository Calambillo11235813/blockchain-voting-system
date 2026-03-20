import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import ticketValidatorAbi from '../abis/contracts/TicketValidator.json';
import { User } from 'src/auth/entities/user.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Role } from 'src/auth/entities/role.entity';

@Injectable()
export class TicketValidatorContractService {
    private readonly hardhatMicroserviceUrl: string;
    private readonly provider: ethers.JsonRpcProvider;
    private readonly wallet: ethers.Wallet;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        @InjectRepository(MemberTenant)
        private readonly memberTenantRepository: Repository<MemberTenant>,
    ) {
        this.hardhatMicroserviceUrl = this.configService.get<string>('hardhat_microservice_url');
        const providerUrl = this.configService.get<string>('blockchain_url');
        const privateKeyRaw = this.configService.get<string>('wallet_private_key');
        if (!privateKeyRaw) {
            throw new Error('wallet_private_key is not configured');
        }
        const trimmedKey = privateKeyRaw.trim();
        const normalizedPrivateKey = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
        this.provider = new ethers.JsonRpcProvider(providerUrl);
        this.wallet = new ethers.Wallet(normalizedPrivateKey, this.provider);
    }

    async deployTicketValidatorContract(userId: string, tenantId: string): Promise<MemberTenant> {
        try {
            // Paso 1: Desplegar el contrato
            const response = await firstValueFrom(
                this.httpService.post(`${this.hardhatMicroserviceUrl}/deploy-ticket-validator-contract`),
            );

            const { contractTicketValidator } = response.data;

            if (!contractTicketValidator) {
                throw new Error('No se pudo obtener la dirección del contrato de TicketValidator');
            }

            console.log("Dirección del contrato de TicketValidator:", contractTicketValidator);
            console.log("Buscando MemberTenant para userId:", userId, "y tenantId:", tenantId);

            // Verificar si el tenant existe
            const tenant = await this.memberTenantRepository.manager.findOne(Tenant, {
                where: { id: tenantId }
            });

            if (!tenant) {
                console.log("Tenant no encontrado con ID:", tenantId);
                // Buscar todos los tenants para depuración
                const allTenants = await this.memberTenantRepository.manager.find(Tenant);
                console.log("Tenants disponibles:", allTenants.map(t => ({ id: t.id, name: t.name })));
                throw new Error(`Tenant no encontrado con ID: ${tenantId}`);
            }
            console.log("Tenant encontrado:", tenant.name);

            // Verificar si el usuario existe
            const user = await this.memberTenantRepository.manager.findOne(User, {
                where: { id: userId }
            });

            if (!user) {
                console.log("Usuario no encontrado con ID:", userId);
                throw new Error(`Usuario no encontrado con ID: ${userId}`);
            }
            console.log("Usuario encontrado:", user.email);

            // Buscar el rol ADMIN
            const adminRole = await this.memberTenantRepository.manager.findOne(Role, {
                where: { name: 'ADMIN' }
            });

            if (!adminRole) {
                console.log("Rol ADMIN no encontrado");
                throw new Error("Rol ADMIN no encontrado");
            }
            console.log("Rol ADMIN encontrado con ID:", adminRole.id);

            // Buscar MemberTenant usando las relaciones correctas
            console.log("Buscando MemberTenant usando QueryBuilder...");
            const queryBuilder = this.memberTenantRepository.createQueryBuilder("memberTenant")
                .leftJoinAndSelect("memberTenant.user", "user")
                .leftJoinAndSelect("memberTenant.tenant", "tenant")
                .where("user.id = :userId", { userId })
                .andWhere("tenant.id = :tenantId", { tenantId });

            console.log("SQL Query:", queryBuilder.getSql());

            let memberTenant = await queryBuilder.getOne();

            console.log("Resultado de búsqueda:", memberTenant ? `Encontrado ID: ${memberTenant.id}` : "No encontrado");

            // Si no se encontró, intentar buscar de forma más directa
            if (!memberTenant) {
                console.log("Buscando MemberTenant directamente por tenantId...");
                const tenantMemberTenants = await this.memberTenantRepository.find({
                    where: { tenantId },
                    relations: ["user"]
                });

                console.log(`Se encontraron ${tenantMemberTenants.length} MemberTenants para este tenant`);

                // Buscar el que corresponda al userId entre los resultados
                memberTenant = tenantMemberTenants.find(mt => mt.user && mt.user.id === userId);

                if (memberTenant) {
                    console.log(`MemberTenant encontrado por búsqueda alternativa, ID: ${memberTenant.id}`);
                }
            }

            // Si todavía no se encontró, crear uno nuevo
            if (!memberTenant) {
                console.log("No se encontró MemberTenant, creando uno nuevo...");

                memberTenant = new MemberTenant();
                memberTenant.tenantId = tenantId;
                memberTenant.tenant = tenant;
                memberTenant.user = user;
                memberTenant.role = adminRole;

                // Guardar el nuevo MemberTenant
                memberTenant = await this.memberTenantRepository.save(memberTenant);
                console.log("Nuevo MemberTenant creado con ID:", memberTenant.id);
            }

            // Actualizar la dirección del contrato
            memberTenant.ticket_validator_address = contractTicketValidator;
            console.log("Actualizando ticket_validator_address a:", contractTicketValidator);

            const updatedMemberTenant = await this.memberTenantRepository.save(memberTenant);
            console.log("MemberTenant actualizado correctamente con ID:", updatedMemberTenant.id);

            return updatedMemberTenant;
        } catch (error) {
            console.error("Error completo:", error);
            throw new BadRequestException(`Error al desplegar el contrato de TicketValidator: ${error.message}`);
        }
    }

    /**
     * Registra la validación de un ticket en la blockchain
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @param ticketId - ID del ticket.
     * @param purchaseId - ID de la compra.
     * @param validatorId - ID del usuario que valida.
     * @param eventId - ID del evento.
     * @param sectionName - Nombre de la sección.
     * @returns Hash de la validación.
     */
    async registerTicketValidation(
        memberTenantId: string,
        ticketId: string,
        purchaseId: string,
        validatorId: string,
        eventId: string,
        sectionName: string,
    ) {
        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId },
            relations: ['tenant']
        });

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>", memberTenant, ">>>>>>>>>>>>>>>>>>>>>>>>", memberTenant.ticket_validator_address);
        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

        try {
            // Obtener el nombre del tenant para el registro
            const tenantId = memberTenant.tenantId;
            const tenantName = memberTenant.tenant?.name || 'Sin nombre';

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
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @param ticketId - ID del ticket a verificar.
     * @returns Información de validación del ticket.
     */
    async verifyTicket(memberTenantId: string, ticketId: string) {
        if (!memberTenantId || !ticketId) {
            throw new BadRequestException('Los parámetros "memberTenantId" y "ticketId" son requeridos.');
        }

        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId }
        });

        console.log(">Buscando MemberTenant con ID:", memberTenantId);
        console.log(">Dirección del contrato de TicketValidator:", memberTenant?.ticket_validator_address);

        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

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
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @param validationHash - Hash a verificar.
     * @returns Información asociada al hash.
     */
    async verifyValidationHash(memberTenantId: string, validationHash: string) {
        if (!memberTenantId || !validationHash) {
            throw new BadRequestException('Los parámetros "memberTenantId" y "validationHash" son requeridos.');
        }

        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId }
        });

        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

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
     * Obtiene estadísticas de validación por tenant
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @returns Estadísticas del tenant.
     */
    async getTenantStats(memberTenantId: string) {
        if (!memberTenantId) {
            throw new BadRequestException('El parámetro "memberTenantId" es requerido.');
        }

        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId }
        });

        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

        try {
            const tenantId = memberTenant.tenantId;
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
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @param eventId - ID del evento.
     * @returns Estadísticas del evento.
     */
    async getEventStats(memberTenantId: string, eventId: string) {
        if (!memberTenantId || !eventId) {
            throw new BadRequestException('Los parámetros "memberTenantId" y "eventId" son requeridos.');
        }

        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId }
        });

        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

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
     * @param memberTenantId - ID del MemberTenant asociado al contrato.
     * @param validatorId - ID del validador.
     * @returns Estadísticas del validador.
     */
    async getValidatorStats(memberTenantId: string, validatorId: string) {
        if (!memberTenantId || !validatorId) {
            throw new BadRequestException('Los parámetros "memberTenantId" y "validatorId" son requeridos.');
        }

        const memberTenant = await this.memberTenantRepository.findOne({
            where: { id: memberTenantId }
        });

        if (!memberTenant || !memberTenant.ticket_validator_address) {
            throw new BadRequestException('Dirección del contrato de TicketValidator no configurada.');
        }

        const ticketContract = new ethers.Contract(
            memberTenant.ticket_validator_address,
            ticketValidatorAbi.abi,
            this.wallet
        );

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