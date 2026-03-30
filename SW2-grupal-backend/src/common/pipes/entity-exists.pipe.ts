import { EntityExistsTypeOrmPipe } from './entity-exists-typeorm.pipe';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { User } from 'src/auth/entities/user.entity';
import { Role } from 'src/auth/entities/role.entity';
import { Permission } from 'src/auth/entities/permission.entity';

import { Event } from 'src/elecciones/entities/event.entity';
import { Faculty } from 'src/elecciones/entities/faculty.entity';
import { Section } from 'src/elecciones/entities/section.entity';
import { Ticket } from 'src/elecciones/entities/ticket.entity';

import { IdentityVerification } from 'src/estudiantes/identidad/entities/identity-verification.entity';




@Injectable()
export class UserExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: User,
            entityName: User.name,
            checkActive: true,
            activeField: 'is_active',
        });
    }
}


@Injectable()
export class RoleExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Role,
            entityName: Role.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class PermissionExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Permission,
            entityName: Permission.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class EventExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Event,
            entityName: Event.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class FacultyExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Faculty,
            entityName: Faculty.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class SectionExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Section,
            entityName: Section.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class TicketExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Ticket,
            entityName: Ticket.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class IdentityVerificationExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: IdentityVerification,
            entityName: IdentityVerification.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}



