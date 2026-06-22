# Flujo de pruebas — Elección completa (local)

Guía paso a paso para levantar el entorno, sembrar datos y probar votación manual y masiva.

## Requisitos previos

- PostgreSQL en ejecución con la BD configurada en `SW2-grupal-backend/.env`
- Dependencias instaladas (`npm install`) en backend, frontend y blockchain
- Archivo Excel del padrón disponible (columna **RECTOR** con `SI`/`NO` para docentes)

---

## 1. Backend

```bash
cd SW2-grupal-backend
npm run start:dev
```

API disponible en `http://localhost:3000/api`

---

## 2. Frontend

En **otra terminal**:

```bash
cd SW2-grupal-frontend
npm run dev
```

UI disponible en `http://localhost:5173`

---

## 3. Nodo Hardhat (blockchain local)

En **otra terminal**:

```bash
cd sw2-grupal-blockchain
npm run local-node
```

Deja esta terminal abierta (nodo en `http://127.0.0.1:8545`).

---

## 4. Desplegar contrato

En **otra terminal** (con el nodo del paso 3 activo):

```bash
cd sw2-grupal-blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Copia la dirección que imprime (`VOTACION_CONTRACT_ADDRESS=...`) y actualízala en `SW2-grupal-backend/.env`. Reinicia el backend si ya estaba corriendo.

---

## 5. Crear elección + papeletas (seed)

```bash
cd SW2-grupal-backend
npm run seed:eleccion
```

Crea:

- Elección **Eleccion prueba 1 (2026)** como activa
- 3 papeletas: Rectorado, Decanato (FICCT), Director (Sistemas)
- Vinculación automática del padrón desde electores existentes

> **Importante:** Si solo quedaron electores en BD (sin padrón previo), todos tendrán `habilitadoRector = false` hasta cargar el Excel.

---

## 6. Cargar padrón Excel (UI)

En el frontend: **Padrón Electoral** → seleccionar la elección → **Cargar padrón** con el `.xlsx`.

Esto corrige `habilitadoRector`, lugar de votación y demás metadatos del padrón.

> Si es la **primera vez** en un entorno limpio, este paso es obligatorio antes de probar Rectorado.

---

## 7. Cargar frentes y candidatos (seed)

```bash
cd SW2-grupal-backend
npm run seed:electoral
```

Inserta 3 frentes (RE, FA, JI) y 15 candidatos vinculados a cada papeleta.

---

## 8. Sellar papeleta y activar elección (UI)

En el frontend (rol **Electoral**):

1. **Configuración de Papeleta** → revisar previsualización → **Aprobar y Sellar Elección**
2. **Gestión de Elección** → **Abrir jornada** / activar votación

---

## 9. Votos manuales (UI)

Probar al menos dos perfiles:

| Perfil   | Qué debería ver                                      |
|----------|------------------------------------------------------|
| Estudiante | Papeletas Decano + Director (según facultad/carrera) |
| Docente    | Decano + Rector (si `habilitadoRector = true` en padrón) |

Login con registro universitario / código docente y contraseña (`iniciales apellido` + `CI`).

---

## 10. Stress test — votos aleatorios masivos

Con backend, nodo Hardhat y elección **activa**:

```bash
cd SW2-grupal-backend
npm run stress:votos
```

Equivalente directo:

```bash
npx ts-node -r tsconfig-paths/register scripts/elecciones/stress-test-voting.ts
```

Por defecto intenta votar con **1000 estudiantes + 50 docentes** del padrón que aún no hayan sufragado.

---

## Orden de terminales (resumen)

| # | Carpeta              | Comando                                      | Dejar abierto |
|---|----------------------|----------------------------------------------|---------------|
| 1 | `SW2-grupal-backend` | `npm run start:dev`                          | Sí            |
| 2 | `SW2-grupal-frontend`| `npm run dev`                                | Sí            |
| 3 | `sw2-grupal-blockchain` | `npm run local-node`                      | Sí            |
| 4 | `sw2-grupal-blockchain` | `npx hardhat run scripts/deploy.js --network localhost` | No |
| 5+ | `SW2-grupal-backend` | seeds / stress según pasos                   | No            |

---

## Scripts npm útiles (backend)

| Comando              | Descripción                              |
|----------------------|------------------------------------------|
| `npm run seed:eleccion`  | Elección + 3 papeletas + padrón       |
| `npm run seed:electoral` | Frentes + candidatos                  |
| `npm run stress:votos`   | Votación masiva de prueba             |
| `npm run simular:votos`  | Simulación alternativa vía VotoService |

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Rectorado con 0 habilitados | Padrón auto-vinculado sin Excel | Cargar padrón Excel (paso 6) |
| Imágenes rotas en papeleta | Rutas `/images/...` | Backend sirviendo `public/` + frontend con `resolveMediaUrl` |
| Stress test falla | Elección no activa o contrato desactualizado | Sellar, abrir jornada y verificar `.env` |
| `seed:electoral` error FK | Papeletas creadas desde UI con otros UUIDs | Usar `seed:eleccion` o adaptar IDs en fixtures |
