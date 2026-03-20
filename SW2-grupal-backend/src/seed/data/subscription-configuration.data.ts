import { SubscriptionPlanTypeEnum } from 'src/common/enums/suscription-plan-type-enum/suscription-plan-type.enum';

/**
 * Datos semilla para la entidad Subscription
 */
const currentDate = new Date();

export const subscriptionSeedData = [
    {
        plan_type: SubscriptionPlanTypeEnum.BASIC,
        price: 29.99,
        active: true,
        created_at: currentDate,
        updated_at: currentDate
    },
    {
        plan_type: SubscriptionPlanTypeEnum.STANDARD,
        price: 79.99,
        active: true,
        created_at: currentDate,
        updated_at: currentDate
    },
    {
        plan_type: SubscriptionPlanTypeEnum.PREMIUM,
        price: 149.99,
        active: true,
        created_at: currentDate,
        updated_at: currentDate
    }
];

export const configurationSeedData = [
    {
        plan: SubscriptionPlanTypeEnum.BASIC,
        limit_tickets: 500,
        blockchain: true,
        facial_recognition: true,
        document_recognition: false,
        firewall: false
    },
    {
        plan: SubscriptionPlanTypeEnum.STANDARD,
        limit_tickets: 2000,
        blockchain: true,
        facial_recognition: true,
        document_recognition: true,
        firewall: false
    },
    {
        plan: SubscriptionPlanTypeEnum.PREMIUM,
        limit_tickets: 10000,
        blockchain: true,
        facial_recognition: true,
        document_recognition: true,
        firewall: true
    }
];

// // Ejemplo de datos para PaymentMembreship (depende de IDs reales de tenants)
// export const generateTenantSubscriptionRecords = (
//     tenantIds: string[],
//     subscriptions: any[],
//     configurations: any[]
// ) => {
//     if (!tenantIds?.length) return [];

//     const records = [];

//     // Para cada tenant, crear un registro de suscripción
//     tenantIds.forEach((tenantId, index) => {
//         const planIndex = index % subscriptions.length;
//         const subscription = subscriptions[planIndex];
//         const configuration = configurations[planIndex];

//         records.push({
//             id: uuid(),
//             tenantId,
//             subscriptionId: subscription.id,
//             configurationId: configuration.id,
//             is_active: true,
//             created_at: currentDate,
//             updated_at: currentDate
//         });
//     });

//     return records;
// };