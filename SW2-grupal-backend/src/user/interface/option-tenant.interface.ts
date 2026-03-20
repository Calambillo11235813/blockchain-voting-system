import { MemberTenant } from 'src/tenant/entities/member-tenant.entity';
import { FindOptionsOrder, FindOptionsRelations, FindOptionsSelect, FindOptionsWhere } from 'typeorm';

export interface IOptionMemberTenant {
    includeTokens?: boolean,
    userId?: string | null,
    skip?: number,
    take?: number,
    where?: FindOptionsWhere<MemberTenant[]>,
    select?: FindOptionsSelect<MemberTenant>,
    order?: FindOptionsOrder<MemberTenant>,
    relations?: FindOptionsRelations<MemberTenant>
}