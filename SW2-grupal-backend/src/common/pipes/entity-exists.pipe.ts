import { EntityExistsTypeOrmPipe } from './entity-exists-typeorm.pipe';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { User } from 'src/auth/entities/user.entity';
import { Role } from 'src/auth/entities/role.entity';
import { Permission } from 'src/auth/entities/permission.entity';

import { Event } from 'src/event/entities/event.entity';
import { Faculty } from 'src/event/entities/faculty.entity';
import { Section } from 'src/event/entities/section.entity';
import { Ticket } from 'src/event/entities/ticket.entity';

import { IdentityVerification } from 'src/identity/entities/identity-verification.entity';

import { Payment } from 'src/payment/entities/payment.entity';
import { Purchase } from 'src/payment/entities/purchase.entity';
import { TicketPurchase } from 'src/payment/entities/ticket-purchase.entity';

import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Configuration } from 'src/tenant/entities/configuration.entity';
import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { Subscription } from 'src/tenant/entities/subscription.entity';


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


@Injectable()
export class PaymentExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Payment,
            entityName: Payment.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class PurchaseExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Purchase,
            entityName: Purchase.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class TicketPurchaseExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: TicketPurchase,
            entityName: TicketPurchase.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class TenantExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Tenant,
            entityName: Tenant.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class ConfigurationExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Configuration,
            entityName: Configuration.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class MemberTenantExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: MemberTenant,
            entityName: MemberTenant.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}


@Injectable()
export class SubscriptionExistsPipe extends EntityExistsTypeOrmPipe {
    constructor(moduleRef: ModuleRef) {
        super(moduleRef, {
            entity: Subscription,
            entityName: Subscription.name,
            checkActive: true,
            activeField: 'is_active'
        });
    }
}








