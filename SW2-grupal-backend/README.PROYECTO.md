# EventLy — Backend (SW2 Grupal)

## Descripción
Backend desarrollado con **NestJS** para la plataforma **EventLy**, orientada a la **gestión de eventos** con:
- **Multi-tenant** (áreas de trabajo/organizaciones) con membresías y roles.
- **Pagos** (Stripe) para compra de tickets.
- **Blockchain** para validación/registro de tickets (integración con contratos + Ethers).
- **Identidad/IA** (AWS Textract/Rekognition) para extracción de texto y comparación facial.
- Integraciones auxiliares: almacenamiento de imágenes (Cloudinary) y un endpoint de chatbot.

La API corre con prefijo global: ` /api `.

## Tecnologías y librerías
- **Runtime / Lenguaje**: Node.js, TypeScript
- **Framework**: NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/config`)
- **Base de datos**: PostgreSQL
- **ORM**: TypeORM (`@nestjs/typeorm`, `typeorm`)
- **Autenticación**: JWT (`@nestjs/jwt`, `passport`, `passport-jwt`, `jsonwebtoken`)
- **Pagos**: Stripe (`stripe`)
- **Blockchain**: Ethers v6 (`ethers`) + ABI empaquetado (ver `src/blockchain/abis/`)
- **IA (AWS)**:
  - Textract (`@aws-sdk/client-textract`) para OCR/extracción de texto
  - Rekognition (`@aws-sdk/client-rekognition`) para comparación facial
- **Imágenes**: Cloudinary (`cloudinary`), Sharp (`sharp`), Jimp (`jimp`)
- **Utilidades**: Joi (validación de env), UUID, Dayjs/Date-fns
- **Tooling**: pnpm, ESLint, Prettier, Jest
- **Docker**: `Dockerfile` + `docker-compose.yaml`

## Módulos principales (src/)
- `auth/`: login y guards (SaaS y tenant)
- `tenant/`: tenants, suscripciones, membresías
- `event/`: gestión de eventos, secciones y tickets
- `payment/`: pagos, compras, webhooks de Stripe
- `blockchain/`: despliegue/interacción con contrato TicketValidator
- `aws/`: OCR y comparación facial (Textract/Rekognition)
- `cloudinary/`: integración para imágenes
- `audit/`: auditoría/registro
- `seed/`: datos semilla
- `chatbot/`: endpoint de chatbot

## Cómo ejecutar
### Requisitos
- Node.js (recomendado: LTS reciente)
- pnpm
- PostgreSQL accesible (local o remoto)

### Local
```bash
pnpm install
pnpm run start:dev
```

### Docker (desarrollo)
```bash
docker compose up --build
```

Por defecto expone el puerto `3000` (mapeado en `docker-compose.yaml`).

## Variables de entorno (obligatorias)
El proyecto valida el `.env` con Joi. Debes definir al menos:

- `PORT`
- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- JWT: `SECRET_KEY_JWT`
- Stripe: `STRIPE_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_TICKET_WEBHOOK_SECRET`, `STRIPE_TENANT_WEBHOOK_SECRET`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Frontend: `FRONTEND_URL`
- Blockchain/Microservicio:
  - `HARDHAT_MICROSERVICE_URL`
  - `BLOCKCHAIN_URL`
  - `WALLET_PRIVATE_KEY`
- AWS:
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - `AWS_ACCESS_KEY_ID_TEXTRACT`, `AWS_SECRET_ACCESS_KEY_TEXTRACT`

Revisa el esquema en `src/config/env/env.schema.ts` para la lista completa y formatos esperados.

## Notas rápidas
- Stripe webhooks requieren `rawBody`; el backend ya lo habilita para rutas `/webhooks/stripe`.
- Si vas a desplegar a producción, conviene usar migraciones de DB y ajustar configuración SSL/TypeORM según entorno.
