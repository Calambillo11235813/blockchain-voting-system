# ============================================================
# Dockerfile — Frontend React/Vite (Sistema de Votación)
# Multi-stage build: Vite build → NGINX para servir la SPA
# ============================================================

# ── Etapa 1: BUILD ──────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copiar manifiestos de dependencias primero (mejor cache de capas)
COPY package.json package-lock.json ./

# Instalar dependencias (incluye devDependencies para Vite)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Aceptar la URL del backend como variable de build
# Se pasa con: docker build --build-arg VITE_API_BASE_URL=http://35.255.131.124/api .
ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Construir la aplicación estática (genera carpeta dist/)
RUN npm run build

# ── Etapa 2: PRODUCCIÓN (NGINX) ────────────────────────────
FROM nginx:alpine AS production

# Eliminar la configuración default de NGINX
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nuestra configuración personalizada para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos compilados desde la etapa de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run inyecta la variable PORT (default 8080)
EXPOSE 8080

# Arrancar NGINX en primer plano (requerido por Docker/Cloud Run)
CMD ["nginx", "-g", "daemon off;"]
