# 📋 Referencia Rápida — Componentes de Administración

## Estructura Reorganizada por Rol

Los componentes administrativos están organizados en tres categorías funcionales dentro de `src/pages/admin/`:

---

## 📂 `admin/compartido/` — Componentes Compartidos

Elementos comunes a todos los roles administrativos.

| Archivo | Descripción | Ruta | Rol |
|---------|-------------|------|-----|
| `ResumenAdmin.jsx` | Dashboard con resumen de 4 tarjetas (padrón, frentes, candidatos, estado) | `/admin/dashboard` | Todos |

---

## 📂 `admin/sistemas/` — Administración del Sistema (Rol: SISTEMAS)

Componentes para gestionar la infraestructura, configuración y auditoría del sistema.

| Archivo | CU | Descripción | Ruta | Función Principal |
|---------|-----|-------------|------|------------------|
| `GestionAdministradores.jsx` | CU-01 | Crear, listar, eliminar cuentas administrativas | `/admin/admins` | `handleCrearAdmin()`, `handleEliminarAdmin()` |
| `ConfiguracionSistema.jsx` | CU-02 | Gestionar parámetros dinámicos (STRING, BOOLEAN, NUMBER) | `/admin/configuracion` | `handleActualizar()`, `handleCrear()`, `renderValor()` |
| `MonitoreoNodos.jsx` | CU-04 | Monitorear salud y estado de nodos blockchain (auto-refresh cada 30s) | `/admin/nodos` | `handleVerificar()`, polling automático |
| `AuditoriaBlockchain.jsx` | CU-20 | Buscar y auditar integridad de transacciones/bloques | `/admin/auditoria` | `handleBuscar()`, `renderTransaccion()`, `renderBloque()` |

### Imports Correctos (desde sistemas/)
```javascript
// Servicios (4 niveles atrás desde sistemas/)
import { ... } from '../../../../services/adminsService'
import { ... } from '../../../../services/configuracionService'
import { ... } from '../../../../services/nodosService'
import { ... } from '../../../../services/auditoriaService'

// Context (4 niveles atrás)
import { useAuth } from '../../../../context/AuthContext'
```

---

## 📂 `admin/electoral/` — Gestión Electoral (Rol: ELECTORAL)

Componentes para gestionar el proceso electoral completo: desde padrón hasta resultados.

| Archivo | CU | Descripción | Ruta | Función Principal |
|---------|-----|-------------|------|------------------|
| `GestionPadron.jsx` | CU-05 | Upload y gestión de padrón electoral con filtros por estamento | `/admin/padron` | `handleUpload()`, `loadPadron()` |
| `GestionFrentesCandidatos.jsx` | CU-06 | Registrar frentes electorales y candidatos | `/admin/frentes-candidatos` | Composición de CoalitionsSection y CandidatesSection |
| `ConfiguracionPapeleta.jsx` | CU-07 | Previsualizar boleta digital completa por cargo/frente | `/admin/configuracion-papeleta` | `ballotColumns` useMemo(), display por frente sigla |
| `GestionElecciones.jsx` | CU-07 | Crear, editar, eliminar elecciones y cargos | `/admin/gestion-eleccion` | `handleSaveElection()`, `handleToggleRestriction()` |
| `EstadisticasEnVivo.jsx` | CU-15,16,17 | Monitoreo de participación en tiempo real (polling 10s) | `/admin/estadisticas-vivo` | Polling automático, Recharts BarChart |
| `ResultadosAuditoria.jsx` | CU-18 | Reporte consolidado con ponderación 50/50 (estudiantes/docentes) | `/admin/auditoria-resultados` | `handleGenerateReport()`, `getReporteConsolidacion()` |

### Imports Correctos (desde electoral/)
```javascript
// Servicios (3 niveles atrás desde electoral/)
import { ... } from '../../../services/electionsService'
import { ... } from '../../../services/estadisticasService'
import { ... } from '../../../components/WhitelistUpload'

// Context (3 niveles atrás)
import { useAuth } from '../../../context/AuthContext'
```

---

## 🔀 Rutas Protegidas (AppRoutes.jsx)

```javascript
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminLayout />}>
    {/* Compartido */}
    <Route path="dashboard" element={<ResumenAdmin />} />
    
    {/* Electoral */}
    <Route path="padron" element={<GestionPadron />} />
    <Route path="frentes-candidatos" element={<GestionFrentesCandidatos />} />
    <Route path="configuracion-papeleta" element={<ConfiguracionPapeleta />} />
    <Route path="gestion-eleccion" element={<GestionElecciones />} />
    <Route path="auditoria-resultados" element={<ResultadosAuditoria />} />
    <Route path="estadisticas-vivo" element={<EstadisticasEnVivo />} />
    
    {/* Sistemas */}
    <Route path="admins" element={<GestionAdministradores />} />
    <Route path="configuracion" element={<ConfiguracionSistema />} />
    <Route path="nodos" element={<MonitoreoNodos />} />
    <Route path="auditoria" element={<AuditoriaBlockchain />} />
  </Route>
</Route>
```

---

## 🔐 Sidebar Filtering (AdminLayout.jsx)

El sidebar filtra componentes según `usuario?.rol`:

```javascript
const SIDEBAR_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin/dashboard' },
  // ... items compartidos
  { 
    key: 'admins', 
    label: 'Gestión de Admins', 
    to: '/admin/admins', 
    rolesRequeridos: ['SISTEMAS']  // ← Solo visible para SISTEMAS
  },
  // ... más items filtrados
]
```

---

## 🚀 Búsqueda Rápida de Componentes

### ¿Necesito crear/editar admin?
→ `src/pages/admin/sistemas/GestionAdministradores.jsx`

### ¿Necesito configurar parámetros del sistema?
→ `src/pages/admin/sistemas/ConfiguracionSistema.jsx`

### ¿Necesito monitorear nodos?
→ `src/pages/admin/sistemas/MonitoreoNodos.jsx`

### ¿Necesito auditar blockchain?
→ `src/pages/admin/sistemas/AuditoriaBlockchain.jsx` (SISTEMAS)
→ `src/pages/admin/electoral/ResultadosAuditoria.jsx` (ELECTORAL - reporte consolidado)

### ¿Necesito gestionar padrón?
→ `src/pages/admin/electoral/GestionPadron.jsx`

### ¿Necesito crear elecciones?
→ `src/pages/admin/electoral/GestionElecciones.jsx`

### ¿Necesito ver estadísticas en vivo?
→ `src/pages/admin/electoral/EstadisticasEnVivo.jsx`

---

## 📐 Profundidad de Imports

Recuerda la profundidad de carpetas para imports correctos:

| Ubicación | Profundidad | Ejemplo |
|-----------|-------------|---------|
| `admin/sistemas/` | 4 niveles | `../../../../services/...` |
| `admin/electoral/` | 3 niveles | `../../../services/...` |
| `admin/compartido/` | 3 niveles | `../../../services/...` |

---

## ✅ Verificación

- ✅ Build pasó correctamente
- ✅ Todos los imports actualizados
- ✅ Rutas en AppRoutes.jsx verificadas
- ✅ Sidebar filtering en AdminLayout.jsx correcto
- ✅ Archivos antiguos eliminados
