# Comandos de Despliegue — DigitalOcean

Guía de comandos utilizados para desplegar el sistema de votación en un Droplet de DigitalOcean.

---

## 1. Configuración Inicial del Servidor

### Conectarse al Droplet por SSH
```bash
ssh root@159.223.154.133
```
Accede al servidor remoto de DigitalOcean mediante SSH usando la IP pública del Droplet.

### Instalar Docker y Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```
Descarga e instala Docker Engine junto con Docker Compose en el servidor.

### Clonar el repositorio
```bash
git clone https://github.com/Calambillo11235813/blockchain-voting-system.git
cd blockchain-voting-system
```
Descarga el código fuente del proyecto desde GitHub al servidor.

---

## 2. Configuración del Entorno

### Editar variables de entorno del Backend
```bash
nano SW2-grupal-backend/.env
```
Abre el editor de texto para configurar las variables de entorno del backend (base de datos, blockchain, biometría, etc.).

---

## 3. Construcción y Despliegue con Docker

### Construir y levantar todos los servicios
```bash
docker compose up -d --build
```
Construye las imágenes Docker de todos los servicios (backend, frontend, base de datos, nginx proxy manager) y los inicia en segundo plano (`-d` = detached mode).

### Construir un servicio específico sin caché
```bash
docker compose build --no-cache backend
docker compose build --no-cache frontend
```
Reconstruye la imagen de un servicio desde cero, ignorando las capas cacheadas. Se usa cuando se modificaron archivos del código fuente.

### Levantar los servicios después de reconstruir
```bash
docker compose up -d
```
Inicia o reinicia los contenedores con las imágenes más recientes. Solo recrea los contenedores que cambiaron.

### Reiniciar un servicio específico
```bash
docker compose restart backend
```
Reinicia un contenedor sin reconstruir su imagen. Útil cuando solo se cambiaron variables de entorno.

---

## 4. Actualizar el Proyecto (Flujo de Despliegue Continuo)

### Descargar los últimos cambios del repositorio
```bash
git pull
```
Trae los cambios más recientes desde GitHub al servidor.

### Flujo completo de actualización
```bash
git pull
docker compose build --no-cache backend
docker compose build --no-cache frontend
docker compose up -d
```
1. Descarga los cambios del código.
2. Reconstruye las imágenes del backend y frontend con el código nuevo.
3. Reinicia los contenedores con las nuevas imágenes.

---

## 5. Monitoreo y Diagnóstico

### Ver los logs de un contenedor
```bash
docker logs voting_backend
docker logs voting_frontend
docker logs voting_db
docker logs nginx_proxy
```
Muestra los registros de salida de un contenedor específico. Esencial para diagnosticar errores de arranque o runtime.

### Ver las últimas N líneas de logs
```bash
docker logs voting_backend --tail 50
```
Muestra solo las últimas 50 líneas del log, útil cuando el log es muy extenso.

### Ver el estado de todos los contenedores
```bash
docker compose ps
```
Lista todos los servicios definidos en `docker-compose.yml` con su estado actual (Running, Exited, Restarting).

---

## 6. Mantenimiento de la Base de Datos

### Ejecutar el script de limpieza de datos
```bash
docker exec -it voting_backend npx ts-node scripts/limpiar-datos-prueba.ts
```
Ejecuta el script de limpieza dentro del contenedor del backend. Borra los datos de prueba (electores, elecciones, candidatos, frentes, padron electoral) sin afectar la estructura de las tablas.

### Acceder a la consola de PostgreSQL
```bash
docker exec -it voting_db psql -U postgres -d Votaciones_Blockchain
```
Abre una sesión interactiva de PostgreSQL dentro del contenedor de la base de datos para ejecutar consultas SQL directamente.

---

## 7. Servicios y Puertos

| Servicio              | Contenedor        | Puerto Interno | Puerto Externo | Descripción                     |
|-----------------------|-------------------|----------------|----------------|---------------------------------|
| PostgreSQL            | `voting_db`       | 5432           | 5432           | Base de datos                   |
| Backend NestJS        | `voting_backend`  | 3000           | —              | API REST (acceso vía proxy)     |
| Frontend Nginx        | `voting_frontend` | 8080           | —              | Aplicación web (acceso vía proxy)|
| Nginx Proxy Manager   | `nginx_proxy`     | 80, 81, 443   | 80, 81, 443   | Proxy reverso, SSL y panel admin|

### URLs de acceso
- **Aplicación web:** `https://votaciones-ficct.duckdns.org`
- **Panel Nginx Proxy Manager:** `http://159.223.154.133:81`
- **Base de datos (pgAdmin):** `159.223.154.133:5432`
