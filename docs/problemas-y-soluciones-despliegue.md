# Problemas y Soluciones — Despliegue en DigitalOcean

Documentación de todos los problemas encontrados durante el despliegue del sistema de votación en DigitalOcean con Docker, Nginx Proxy Manager y SSL.

---

## 1. `dist/main.js` no se generaba correctamente

**Error:**
```
Error: Cannot find module '/app/dist/main.js'
```

**Causa:**  
Al quitar `scripts/` del `.dockerignore`, TypeScript detectó archivos fuente en dos carpetas raíz (`src/` y `scripts/`). Esto provocó que `tsc` creara subdirectorios separados en `dist/`:
- Antes: `src/main.ts` → `dist/main.js` ✅
- Después: `src/main.ts` → `dist/src/main.js` ❌

**Solución:**  
Agregar `"scripts"` a la lista de exclusiones en `tsconfig.build.json`:
```json
{
  "exclude": ["node_modules", "test", "dist", "scripts"]
}
```

---

## 2. Variables de entorno requeridas faltantes

**Error:**
```
Config validation error: "FRONTEND_URL" is required. "HARDHAT_MICROSERVICE_URL" is required
```

**Causa:**  
El esquema de validación Joi en `env.schema.ts` exige `FRONTEND_URL` y `HARDHAT_MICROSERVICE_URL`, pero no estaban definidas en el `docker-compose.yml`.

**Solución:**  
Agregar las variables faltantes al servicio `backend` en `docker-compose.yml`:
```yaml
environment:
  - FRONTEND_URL=https://votaciones-ficct.duckdns.org
  - HARDHAT_MICROSERVICE_URL=http://localhost:4000
```

---

## 3. Rate Limit de Let's Encrypt (SSL)

**Error:**
```
too many certificates (5) already issued for this exact set of identifiers in the last 168h0m0s
```

**Causa:**  
Let's Encrypt permite máximo 5 certificados idénticos para el mismo dominio exacto en un período de 7 días. Se agotaron los intentos para `elecciones-ficct.duckdns.org`.

**Solución:**  
Crear un nuevo subdominio en DuckDNS (ej. `votaciones-ficct`) apuntando a la misma IP y solicitar el certificado SSL para este nuevo dominio.

---

## 4. Error 502 Bad Gateway — Puerto incorrecto del Frontend

**Error:**
```
502 Bad Gateway (openresty)
```

**Causa:**  
En Nginx Proxy Manager, el Forward Port del frontend estaba configurado en `80`, pero el contenedor del frontend expone el puerto `8080`.

**Solución:**  
Cambiar el Forward Port a `8080` en la configuración del Proxy Host de Nginx Proxy Manager:
- Forward Hostname / IP: `voting_frontend`
- Forward Port: `8080`

---

## 5. Error 405 Not Allowed al hacer Login

**Error:**
```
Solicitud fallida con código de estado 405
POST /api/auth/login-admin 405 (Not Allowed)
```

**Causa:**  
Las peticiones a `/api` estaban siendo enviadas al contenedor del frontend (que solo sirve archivos estáticos con Nginx). Al recibir un `POST`, Nginx responde con 405 porque solo acepta `GET`.

**Solución:**  
Agregar una **Custom Location** en Nginx Proxy Manager:
- Location: `/api`
- Scheme: `http`
- Forward Hostname / IP: `backend` (o `voting_backend`)
- Forward Port: `3000`

---

## 6. Error 502 Bad Gateway — Backend en crash loop (`DB_HOST=localhost`)

**Error:**
```
POST /api/auth/login-admin 502 (Bad Gateway)
```

**Causa:**  
El archivo `.env` del backend tenía `DB_HOST=localhost`. En Docker, `localhost` apunta al interior del propio contenedor, no al contenedor de PostgreSQL (`db`). Esto causaba que el backend se reiniciara infinitamente.

**Solución:**  
Sobreescribir `DB_HOST` en `docker-compose.yml` con la sección `environment` (que tiene prioridad sobre `env_file`):
```yaml
backend:
  env_file:
    - ./SW2-grupal-backend/.env
  environment:
    - DB_HOST=db
```

---

## 7. Biometría — Permiso denegado para crear carpeta temporal

**Error:**
```
Error: EACCES: permission denied, mkdir '/app/temp'
```

**Causa:**  
El Dockerfile usa `USER node` para ejecutar la aplicación como usuario sin privilegios. Al intentar crear la carpeta `/app/temp` (necesaria para multer/uploads de imágenes), el usuario `node` no tiene permisos.

**Solución:**  
Crear la carpeta y asignarle permisos **antes** de cambiar al usuario `node` en el Dockerfile:
```dockerfile
# Crear directorios temporales para biometría (multer uploads)
RUN mkdir -p /app/temp && chown node:node /app/temp

# Ejecutar como usuario no-root por seguridad
USER node
```

---

## 8. Imágenes de candidatos y logos no se muestran

**Error:**  
Las imágenes de candidatos y logos de frentes aparecían como íconos rotos en la página de la papeleta electoral.

**Causa (parte 1 — Frontend):**  
La función `resolveMediaUrl()` en `mediaUrlUtils.js` convertía `VITE_API_BASE_URL=/api` en una cadena vacía al quitar `/api`. Resultado: las URLs de imágenes se generaban como `/images/frentes/ji.png` (sin prefijo `/api`), por lo que iban al frontend en lugar del backend.

**Solución (parte 1):**  
Modificar `getApiOrigin()` para que en producción (ruta relativa) conserve `/api`:
```javascript
export function getApiOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
  if (apiBase.startsWith('/')) {
    return apiBase.replace(/\/+$/, '')  // → "/api"
  }
  return apiBase.replace(/\/api\/?$/, '')
}
```

**Causa (parte 2 — Backend):**  
Aunque las URLs ahora se generaban como `/api/images/frentes/ji.png`, el backend servía los archivos estáticos sin prefijo (`/images/...`), porque `useStaticAssets()` no tenía el prefijo `/api`.

| Componente            | Ruta                            |
|-----------------------|---------------------------------|
| Navegador pide        | `/api/images/frentes/ji.png`    |
| Nginx envía al backend| `/api/images/frentes/ji.png` ✅  |
| Backend servía antes  | `/images/frentes/ji.png` ❌      |
| Backend sirve ahora   | `/api/images/frentes/ji.png` ✅  |

**Solución (parte 2):**  
Agregar el prefijo `/api` a `useStaticAssets` en `main.ts`:
```typescript
app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/api' });
```

---

## 9. Script de limpieza falla con path aliases de TypeScript

**Error:**
```
Error: Cannot find module 'src/autenticacion/services/auth.service'
```

**Causa:**  
El script `limpiar-datos-prueba.ts` importaba `AppModule` de NestJS, que internamente usa path aliases (`src/...`). Dentro del contenedor Docker, `ts-node` no puede resolver esos aliases.

**Solución:**  
Reescribir el script para que se conecte directamente a PostgreSQL sin depender de NestJS:
```typescript
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'nicolas123',
  database: process.env.DB_NAME || 'Votaciones_Blockchain',
});
```

---

## 10. Script de limpieza — Nombre incorrecto de tabla

**Error:**
```
QueryFailedError: relation "elector" does not exist
```

**Causa:**  
El script usaba `DELETE FROM elector` (singular), pero la entidad define la tabla como `@Entity('electores')` (plural).

**Solución:**  
Corregir el nombre de la tabla en el script:
```sql
DELETE FROM electores
```
