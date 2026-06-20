# HU-001 — Carga del Padrón Electoral (Formato Excel Dual)

## Objetivo

Permitir a la Corte Electoral cargar masivamente el padrón de votantes habilitados para una elección, a partir de un archivo Excel con **dos hojas**: `Estudiantes` y `Docentes`.

## Endpoint

```
POST /api/elecciones/:eleccionId/padron
Content-Type: multipart/form-data
Campo: file (.xlsx)
```

## Formato del archivo Excel

### Hoja `Estudiantes`

| Columna | Obligatorio | Descripción |
|---|---|---|
| Cod.Fac. | Sí | Código de facultad |
| Facultad | Sí | Nombre de la facultad |
| Cod.lugar | Sí | Código del recinto de votación |
| LUGAR DE VOTACION | Sí | Nombre del recinto |
| CARR-PL | Sí | Código de carrera/plan |
| CARRERA | Sí | Nombre de la carrera |
| Registro | Sí | Número de registro universitario (solo dígitos) |
| Nombre | Sí | Nombre completo del estudiante |
| CI | Sí | Cédula de identidad. Acepta complemento: `7453385 SC`, `11341460-SCZ`, `9647174-1S-SCZ` |
| RECTOR | Sí | `SI` / `NO` — elegibilidad para votar por Rector |

### Hoja `Docentes`

| Columna | Obligatorio | Descripción |
|---|---|---|
| Cod.Fac. | Sí | Código de facultad |
| Facultad | Sí | Nombre de la facultad |
| Cod.Lugar | Sí | Código del recinto de votación |
| Lugar | Sí | Nombre del recinto |
| Cod.Docente | Sí | Código docente (se usa como `registro` en el sistema) |
| Docente | Sí | Nombre completo del docente |
| C.I. | Sí | Cédula de identidad |
| RECTOR | Sí | `SI` / `NO` — elegibilidad para votar por Rector |

**Notas:**

- Al menos una de las dos hojas debe existir y ser válida.
- Los nombres de hoja son case-insensitive (`Estudiantes`, `ESTUDIANTES`, etc.).
- El estamento se infiere automáticamente por la hoja de origen.
- Para docentes, el campo `carrera` en BD se completa con el valor de `Facultad`.

## Respuesta exitosa

```json
{
  "statusCode": 200,
  "data": {
    "totalProcesado": 1500,
    "estudiantesProcesados": 1400,
    "docentesProcesados": 100,
    "electoresInsertados": 1200,
    "electoresActualizados": 300,
    "registrosHabilitados": 1500,
    "erroresEstructurales": []
  },
  "message": "Padrón electoral cargado correctamente."
}
```

`erroresEstructurales` incluye advertencias de filas omitidas (ej. nombre con un solo token) sin abortar la carga si hay filas válidas.

## Modelo de datos

### Tabla `electores` (catálogo global)

Campos nuevos: `facultad`, `codFacultad`, `codCarrera`.

### Tabla `padron_electoral` (por elección)

Campos nuevos: `codLugar`, `lugarVotacion`, `habilitadoRector`.

## Validaciones

1. Cabeceras completas por hoja presente.
2. Duplicados de `registro` o `CI` dentro del archivo (incluye cross-sheet).
3. Colisión CI ↔ registro contra electores ya existentes en BD.
4. Upsert idempotente: re-cargar el mismo archivo actualiza datos.

## Uso de `habilitadoRector`

- **Voto:** `VotoService` rechaza votos por candidatos al cargo `Rector` si `habilitadoRector = false`.
- **Papeleta:** `GET /api/elecciones/:id/papeleta?registro=...` oculta el cargo Rector si el elector no está habilitado.

## Plantilla de ejemplo

Generar con:

```bash
npx ts-node -r tsconfig-paths/register scripts/generar-plantilla-padron.ts
```

Archivo resultante: `docs/plantilla-padron-ejemplo.xlsx`

## Archivos relacionados

- `src/elecciones/services/padron.service.ts`
- `src/elecciones/services/padron/padron-excel.parser.ts`
- `src/elecciones/entities/padron-electoral.entity.ts`
- `src/electores/entities/elector.entity.ts`
