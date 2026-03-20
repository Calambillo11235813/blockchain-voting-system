import {
    PipeTransform,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate as validateUuid } from 'uuid';
import { ModuleRef } from '@nestjs/core';

interface EntityExistsOptions {
    entity: any;
    entityName?: string;
    checkActive?: boolean;
    activeField?: string;
    idField?: string;
    additionalChecks?: Record<string, any>;
}

@Injectable()
export class EntityExistsTypeOrmPipe implements PipeTransform {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly options: EntityExistsOptions
    ) { }

    async transform(value: string) {
        if (!validateUuid(value)) {
            throw new NotFoundException(
                `${this.options.entityName || 'Entidad'} con ID inválido`
            );
        }

        const repository = this.moduleRef.get(
            getRepositoryToken(this.options.entity),
            { strict: false }
        );

        const where: Record<string, any> = {
            [this.options.idField || 'id']: value,
            ...this.options.additionalChecks
        };

        if (this.options.checkActive) {
            where[this.options.activeField || 'state'] = true;
        }

        const entity = await repository.findOne({ where });

        if (!entity) {
            throw new NotFoundException(
                `${this.options.entityName || 'Entidad'} con ID ${value} no encontrada o inactiva`
            );
        }

        // Opcional: devolver la entidad en lugar del ID
        return {
            value,
            entity
        };

        // O simplemente devolver el ID validado
        // return value;
    }
}

