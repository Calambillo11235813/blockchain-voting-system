import { Module } from '@nestjs/common';
import {
    ConfigurationExistsPipe,
    EventExistsPipe,
    FacultyExistsPipe,
    IdentityVerificationExistsPipe,
    MemberTenantExistsPipe,
    PaymentExistsPipe,
    PermissionExistsPipe,
    PurchaseExistsPipe,
    RoleExistsPipe,
    SectionExistsPipe,
    SubscriptionExistsPipe,
    TenantExistsPipe,
    TicketExistsPipe,
    TicketPurchaseExistsPipe,
    UserExistsPipe
} from './pipes/entity-exists.pipe';

@Module({
    providers: [
        UserExistsPipe,
        RoleExistsPipe,
        PermissionExistsPipe,
        EventExistsPipe,
        FacultyExistsPipe,
        SectionExistsPipe,
        TicketExistsPipe,
        IdentityVerificationExistsPipe,
        PaymentExistsPipe,
        PurchaseExistsPipe,
        TicketPurchaseExistsPipe,
        TenantExistsPipe,
        ConfigurationExistsPipe,
        MemberTenantExistsPipe,
        SubscriptionExistsPipe
    ],
    exports: [
        UserExistsPipe,
        RoleExistsPipe,
        PermissionExistsPipe,
        EventExistsPipe,
        FacultyExistsPipe,
        SectionExistsPipe,
        TicketExistsPipe,
        IdentityVerificationExistsPipe,
        PaymentExistsPipe,
        PurchaseExistsPipe,
        TicketPurchaseExistsPipe,
        TenantExistsPipe,
        ConfigurationExistsPipe,
        MemberTenantExistsPipe,
        SubscriptionExistsPipe
    ]
})
export class CommonModule { }