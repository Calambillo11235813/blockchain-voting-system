export interface ListTenant {
    total: number;
    tenants: Tenant[];
}

export interface Tenant {
    memberTenantId: string;
    tenantId: string;
    tenantName: string;
    displayName: string;
    role: Role;
    token: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
