FROM node:22-alpine

# Instala pnpm globalmente
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copia los archivos necesarios para la instalación de dependencias
COPY package.json pnpm-lock.yaml ./

COPY ssl/ca-certificate.crt /app/ssl/ca-certificate.crt

# Instala todas las dependencias
RUN pnpm install

# Instala express explícitamente
RUN pnpm add express

# Copia el resto del código fuente
COPY . .

# Construye la aplicación
RUN pnpm run build

# Cambiar al usuario node para mayor seguridad
USER node

# Exponer el puerto 3000 que utiliza NestJS por defecto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/main"]
