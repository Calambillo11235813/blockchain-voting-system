import { Module } from '@nestjs/common';
import {
    EventExistsPipe,
    FacultyExistsPipe,
    IdentityVerificationExistsPipe,
    PermissionExistsPipe,
    RoleExistsPipe,
    SectionExistsPipe,
    TicketExistsPipe,
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
        IdentityVerificationExistsPipe
    ],
    exports: [
        UserExistsPipe,
        RoleExistsPipe,
        PermissionExistsPipe,
        EventExistsPipe,
        FacultyExistsPipe,
        SectionExistsPipe,
        TicketExistsPipe,
        IdentityVerificationExistsPipe
    ]
})
export class CommonModule { }
