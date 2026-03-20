// import { SubscriptionPlanType } from 'src/common/enums/suscription-plan-type-enum/suscription-plan-type.enum';
// import { Configuration } from '../entities/configuration.entity';

// export const SUBSCRIPTION_PLAN_CONFIG = {
//     [SubscriptionPlanType.BASIC]: {
//         name: 'Plan Básico',
//         monthly_price: 29.99,
//         duration_days: 30,
//         features: {
//             max_events: 5,
//             limit_tickets: 500,
//             blockchain: true,
//             facial_recognition: true,
//             document_recognition: false,
//             firewall: false,
//             max_tickets_per_event: 100,
//             identity_verification: false,
//             analytics: false,
//             blockchain_certification: true
//         },
//         feature_list: [
//             "Hasta 5 eventos simultáneos",
//             "Máximo 500 tickets en total",
//             "Verificación blockchain básica",
//             "Reconocimiento facial básico",
//             "Soporte por email"
//         ]
//     },
//     [SubscriptionPlanType.STANDARD]: {
//         name: 'Plan Estándar',
//         monthly_price: 79.99,
//         duration_days: 90,
//         features: {
//             max_events: 20,
//             limit_tickets: 2000,
//             blockchain: true,
//             facial_recognition: true,
//             document_recognition: true,
//             firewall: false,
//             max_tickets_per_event: 500,
//             identity_verification: true,
//             analytics: false,
//             blockchain_certification: true
//         },
//         feature_list: [
//             "Hasta 20 eventos simultáneos",
//             "Máximo 2000 tickets en total",
//             "Verificación blockchain avanzada",
//             "Reconocimiento facial completo",
//             "Reconocimiento de documentos",
//             "Soporte prioritario"
//         ]
//     },
//     [SubscriptionPlanType.PREMIUM]: {
//         name: 'Plan Premium',
//         monthly_price: 149.99,
//         duration_days: 365,
//         features: {
//             max_events: -1, // Ilimitado
//             limit_tickets: 10000,
//             blockchain: true,
//             facial_recognition: true,
//             document_recognition: true,
//             firewall: true,
//             max_tickets_per_event: -1, // Ilimitado
//             identity_verification: true,
//             analytics: true,
//             blockchain_certification: true
//         },
//         feature_list: [
//             "Eventos ilimitados",
//             "Hasta 10000 tickets en total (ampliable)",
//             "Verificación blockchain premium",
//             "Suite completa de reconocimiento facial y documental",
//             "Firewall de seguridad avanzado",
//             "Analíticas en tiempo real",
//             "Soporte 24/7",
//             "API para integraciones"
//         ]
//     }
// };

// /**
//  * Obtiene las características de un plan específico
//  * @param planType Tipo de plan de suscripción
//  * @returns Configuración completa del plan
//  */
// export function getPlanFeatures(planType: SubscriptionPlanType) {
//     return SUBSCRIPTION_PLAN_CONFIG[planType] || SUBSCRIPTION_PLAN_CONFIG[SubscriptionPlanType.BASIC];
// }

// /**
//  * Genera un objeto de configuración para la entidad Configuration
//  * @param planType Tipo de plan de suscripción
//  * @returns Configuración para guardar en la base de datos
//  */
// export function createConfigurationFromPlan(planType: SubscriptionPlanType): Partial<Configuration> {
//     const plan = getPlanFeatures(planType);

//     return {
//         plan: planType,
//         limit_tickets: plan.features.limit_tickets,
//         blockchain: plan.features.blockchain,
//         facial_recognition: plan.features.facial_recognition,
//         document_recognition: plan.features.document_recognition,
//         firewall: plan.features.firewall
//     };
// }

// /**
//  * Calcula la fecha de finalización de una suscripción
//  * @param planType Tipo de plan de suscripción
//  * @param startDate Fecha de inicio (por defecto, la fecha actual)
//  * @returns Fecha de finalización calculada
//  */
// export function calculateEndDate(planType: SubscriptionPlanType, startDate: Date = new Date()): Date {
//     const plan = getPlanFeatures(planType);
//     const endDate = new Date(startDate);
//     endDate.setDate(endDate.getDate() + plan.duration_days);
//     return endDate;
// }