# ============================================================
# Dockerfile — Backend NestJS (Votación Blockchain)
# Multi-stage build optimizado con Debian para Inteligencia Artificial
# ============================================================

# ── Etapa 1: BUILD ──────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Instalar herramientas de compilación nativa para librerías de IA y Sharp en Debian
RUN apt-get update && apt-get install -y python3 make g++ build-essential

# Copiar manifiestos
COPY package.json package-lock.json ./

# Instalar TODAS las dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript → JavaScript
RUN npm run build

# Verificar que el build generó los archivos correctamente
RUN echo "=== Contenido de dist/ ===" && ls -la dist/ && ls dist/main.js

# NOTA: No hacemos npm prune --omit=dev para mantener ts-node y poder ejecutar los scripts de prueba en producción.

# ── Etapa 2: PRODUCCIÓN ────────────────────────────────────
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Instalar Tesseract OCR (requerido para la validación de carnets)
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*

# Copiar código y dependencias desde la etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copiar modelos de FaceAPI y archivos Tesseract
COPY models ./models
COPY eng.traineddata ./eng.traineddata
COPY spa.traineddata ./spa.traineddata

# Copiar certificado SSL y assets públicos
COPY ssl ./ssl
COPY public ./public

ENV PORT=8080
EXPOSE 8080

# Ejecutar como usuario no-root por seguridad
USER node

# Arrancar la aplicación
CMD ["node", "dist/main.js"]
