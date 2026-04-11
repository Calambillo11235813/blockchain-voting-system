# HU-004 — Control de Acceso Electoral

Garantiza que un estudiante solo pueda iniciar sesión e ingresar al sistema de votación en la fecha correcta, dentro del horario permitido (08:00 – 16:00) y, opcionalmente, en el slot horario asignado a la inicial de su apellido.

---

## Archivos involucrados

### 🖥️ FRONTEND

---

#### `src/pages/Login.jsx`
**¿Qué hace?**
Es la pantalla de acceso al sistema. El estudiante ingresa su número de registro y contraseña. Si el servidor rechaza el login por control de acceso, muestra mensajes amigables con información sobre su turno y un temporizador de cuenta regresiva.

**Detalles técnicos:**
- Si el backend regresa `status: 'WRONG_ALPHABETICAL_SLOT'`, muestra el mensaje de turno y activa un **contador en tiempo real** que se actualiza cada segundo y se apaga automáticamente cuando llega el turno del estudiante.
- Si el backend regresa `status: 'NOT_STARTED'` o `status: 'FINISHED'`, muestra el mensaje informativo pero no activa contador.
- Cuando el login es exitoso, redirige a `/estudiante/biometria` (o `/admin/dashboard` si es administrador).

---

#### `src/services/authService.js`
**¿Qué hace?**
Envía el request de login al backend. Si el servidor devuelve un error `403 Forbidden`, el error viaja hasta `Login.jsx` con los datos del turno asignado del estudiante.

---

#### `src/utils/electionUtils.js`
**¿Qué hace?**
Contiene funciones de utilidad para manejar tiempo en el cliente.

**Funciones clave:**
- `getTimeToSlot(inicio)` — Calcula cuántos milisegundos faltan para que inicie el slot del estudiante.
- `formatCountdown(ms)` — Convierte esos milisegundos en un texto legible tipo `"00:47:32 restantes."`.

---

### ⚙️ BACKEND

---

#### `src/auth/guards/election.guard.ts` ⭐ (Guardián central)
**¿Qué hace?**
Es el primer filtro de seguridad que intercepta cualquier intento de login de estudiante. Se ejecuta automáticamente **antes** que el controlador de autenticación.

**Detalles técnicos:**
- Solo actúa sobre la ruta `/auth/login` (no admin).
- Busca al estudiante por su número de registro en la base de datos.
- Si no hay ninguna elección activa para hoy → lanza `ForbiddenException` con `status: 'NOT_STARTED'`.
- Si hay elección activa, llama a `EleccionesService.validarAccesoVotante()` con el apellido del estudiante.
- Si pasa todas las validaciones → deja continuar el request al controlador de Auth.

---

#### `src/elecciones/services/elecciones.service.ts` ⭐ (Lógica del negocio)
**¿Qué hace?**
Contiene todas las reglas de negocio del control de acceso electoral. Es el servicio que el Guard y el Sistema consultan para decidir si un estudiante puede votar.

**Métodos clave para HU-004:**

| Método | Descripción |
|--------|-------------|
| `obtenerEleccionActivaDelDia()` | Busca si hay una elección activa con la fecha de hoy. Si `BYPASS_ELECTION_TIME=true`, retorna la más reciente sin importar la fecha. |
| `validarAccesoVotante(apellido, eleccionId)` | Valida en 3 capas: si la elección está activa, si el horario actual está dentro de la jornada (08:00-16:00), y si aplica la restricción alfabética, si el slot de la inicial del apellido coincide con la hora actual. |
| `obtenerVentanaAsignadaPorApellido(fecha, apellido)` | Calcula exactamente a qué hora le toca votar a un estudiante según su apellido. Se retorna en el error para que el frontend muestre el temporizador. |
| `obtenerRangoAlfabeticoPorSlot(slotIndex)` | Divide el abecedario en 8 slots de 1 hora cada uno: A-D (08:00), E-H (09:00), I-K (10:00), L-N (11:00), O-Q (12:00), R-T (13:00), U-W (14:00), X-Z (15:00). |

---

#### `src/auth/services/auth.service.ts`
**¿Qué hace?**
Gestiona la validación de credenciales (registro y contraseña). Luego de que el Guard aprueba el acceso, este servicio verifica que el usuario exista y que la contraseña sea correcta, generando el JWT de sesión.

---

## Variables de entorno (`.env`)

| Variable | Descripción | Valor dev | Valor prod |
|---|---|---|---|
| `BYPASS_ELECTION_TIME` | **Interruptor maestro.** Si está en `true`, ignora restricciones de fecha, horario y slot alfabético. | `true` | `false` |

> ⚠️ **IMPORTANTE:** Cambiar `BYPASS_ELECTION_TIME=false` antes de pasar a producción, de lo contrario cualquier estudiante podrá votar en cualquier momento del año.

---

## Reglas de negocio

### Jornada electoral
```
Inicio:  08:00 (hora local del servidor)
Cierre:  16:00 (hora local del servidor)
```

### División alfabética (8 slots de 1 hora)
| Slot | Horario | Apellidos que pueden votar |
|------|---------|---------------------------|
| 1 | 08:00 – 09:00 | A, B, C, D |
| 2 | 09:00 – 10:00 | E, F, G, H |
| 3 | 10:00 – 11:00 | I, J, K |
| 4 | 11:00 – 12:00 | L, M, N |
| 5 | 12:00 – 13:00 | O, P, Q |
| 6 | 13:00 – 14:00 | R, S, T |
| 7 | 14:00 – 15:00 | U, V, W |
| 8 | 15:00 – 16:00 | X, Y, Z |

> La restricción alfabética puede activarse o desactivarse por elección con el campo `restriccionAlfabeticaActiva` en la base de datos.

---

## Posibles errores del backend y respuesta en frontend

| Status devuelto | Causa | Respuesta en UI |
|---|---|---|
| `NOT_STARTED` | No hay elección programada para hoy | Mensaje informativo sin contador |
| `NOT_STARTED` | La jornada del día aún no ha empezado | Mensaje informativo sin contador |
| `FINISHED` | La jornada del día ya terminó | Mensaje informativo |
| `WRONG_ALPHABETICAL_SLOT` | El apellido no corresponde al slot horario actual | Mensaje + **Contador regresivo** hasta el inicio de su turno |
| `403 Forbidden` | Credenciales inválidas (manejado por AuthService) | Mensaje genérico de credenciales |

---

## Flujo completo de interacción

```
ESTUDIANTE
    │
    │  Ingresa Número de Registro + Contraseña
    ▼
Login.jsx (Frontend)
    │
    │  POST /api/auth/login { registro, password }
    ▼
authService.js (Frontend)
    │
    ▼
ElectionGuard (Backend) ← Se ejecuta ANTES que el controlador
    │  Busca el estudiante por registro en la BD
    │  Llama a EleccionesService.obtenerEleccionActivaDelDia()
    │
    │  ¿Hay elección para hoy?
    │  NO → ForbiddenException NOT_STARTED ─────────────────┐
    │  SÍ → llama a validarAccesoVotante()                  │
    │         │                                              │
    │         ├─ ¿BYPASS_ELECTION_TIME=true?                │
    │         │   SÍ → permite sin restricciones ──────┐    │
    │         │                                        │    │
    │         ├─ ¿Hora actual < 08:00?                 │    │
    │         │   SÍ → ForbiddenException NOT_STARTED ─┼────┤
    │         │                                        │    │
    │         ├─ ¿Hora actual >= 16:00?                │    │
    │         │   SÍ → ForbiddenException FINISHED ────┼────┤
    │         │                                        │    │
    │         ├─ ¿restriccionAlfabeticaActiva=false?   │    │
    │         │   SÍ → permite sin filtro alfabético ──┤    │
    │         │                                        │    │
    │         └─ ¿Inicial del apellido en slot actual? │    │
    │              NO → ForbiddenException WRONG_SLOT ─┼────┤
    │              SÍ → permite acceso ────────────────┘    │
    ▼                                                       │
AuthService (Backend)                                       │
    │  Valida registro + contraseña (bcrypt)                │
    │  Genera JWT con datos del estudiante                  │
    ▼                                                       │
Login.jsx (Frontend)                                        │
    │  Recibe JWT → lo guarda en contexto                   │
    │  Redirige a /estudiante/biometria                     │
    ▼                                                  ◄────┘
    │  Si error 403 → Lee el status del error
    ├─ WRONG_ALPHABETICAL_SLOT → muestra mensaje + temporizador
    ├─ NOT_STARTED / FINISHED  → muestra mensaje informativo
    └─ Otro 403/401            → mensaje de credenciales inválidas
```
