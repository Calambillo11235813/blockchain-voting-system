export const roleSeedData = [
    {
        name: 'ADMIN',
        description: 'Administrador del sistema con acceso completo',
    },
    {
        name: 'MANAGER',
        description: 'Gestor con acceso a la mayoría de las funcionalidades',
    },
    {
        name: 'USER',
        description: 'Usuario estándar con acceso limitado',
    },
    {
        name: 'GUEST',
        description: 'Usuario invitado con acceso mínimo',
    }
];


export const permissionSeedData = [
    {
        name: 'user:create',
        description: 'Crear usuarios',
        module: 'USER',
    },
    {
        name: 'user:read',
        description: 'Ver usuarios',
        module: 'USER',
    },
    {
        name: 'user:update',
        description: 'Actualizar usuarios',
        module: 'USER',
    },
    {
        name: 'user:delete',
        description: 'Eliminar usuarios',
        module: 'USER',
    },

    // Permisos de tickets
    {
        name: 'ticket:create',
        description: 'Crear tickets',
        module: 'TICKET',
    },
    {
        name: 'ticket:read',
        description: 'Ver tickets',
        module: 'TICKET',
    },
    {
        name: 'ticket:update',
        description: 'Actualizar tickets',
        module: 'TICKET',
    },
    {
        name: 'ticket:delete',
        description: 'Eliminar tickets',
        module: 'TICKET',
    },

    // Permisos de informes/reportes
    {
        name: 'report:generate',
        description: 'Generar reportes',
        module: 'REPORT',
    },
    {
        name: 'report:read',
        description: 'Ver reportes',
        module: 'REPORT',
    }
];

export const rolePermissionSeedData = {
    ADMIN: permissionSeedData.map(permission => permission.name),

    MANAGER: permissionSeedData
        .filter(permission => permission.name !== 'user:delete')
        .map(permission => permission.name),

    USER: [
        'user:read',
        'ticket:create',
        'ticket:read',
        'ticket:update',
        'report:read'
    ],

    GUEST: [
        'user:read',
        'ticket:read',
        'report:read'
    ]
};