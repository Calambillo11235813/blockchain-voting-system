# ============================================================
# Dockerfile — Backend NestJS (Votación Blockchain)
# Multi-stage build optimizado para Google Cloud Run
# ============================================================

# ── Etapa 1: BUILD ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar
# módulos nativos (sharp, bcrypt, canvas, etc.)
RUN apk add --no-cache python3 make g++ vips-dev

# Copiar manifiestos de dependencias primero (mejor cache de capas)
COPY package.json package-lock.json ./

# Instalar TODAS las dependencias (incluye devDependencies para el build)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript → JavaScript (genera carpeta dist/)
RUN npm run build

# Eliminar devDependencies para reducir el tamaño de la imagen final
RUN npm prune --omit=dev

# ── Etapa 2: PRODUCCIÓN ────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Instalar dependencias de runtime necesarias para módulos nativos
# vips: requerido por sharp (procesamiento de imágenes)
# tesseract-ocr: requerido para OCR de carnets (CU biometría)
RUN apk add --no-cache vips tesseract-ocr

# Copiar solo lo necesario desde la etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copiar modelos de FaceAPI (reconocimiento facial)
COPY models ./models

# Copiar datos entrenados de Tesseract (OCR español e inglés)
COPY eng.traineddata ./eng.traineddata
COPY spa.traineddata ./spa.traineddata

# Copiar certificado SSL para conexión a Cloud SQL (si se usa DB_SSL=true)
COPY ssl ./ssl

# Copiar assets públicos (archivos estáticos servidos por NestJS)
COPY public ./public

# Cloud Run inyecta la variable PORT automáticamente (default 8080)
ENV PORT=8080
EXPOSE 8080

# Ejecutar como usuario no-root por seguridad
USER node

# Arrancar la aplicación compilada
CMD ["node", "dist/main.js"]
