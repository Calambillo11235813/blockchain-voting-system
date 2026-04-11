# HU-005 — Integración de Validación Biométrica

Permite que el sistema verifique la identidad real del estudiante antes de emitir un voto.
Se usan tres imágenes: foto frontal del carnet, foto trasera del carnet y una selfie tomada en tiempo real.

---

## Archivos involucrados

### 🖥️ FRONTEND

---

#### `src/components/biometria/CaptureFlow.jsx`
**¿Qué hace?**
Es la pantalla principal que el estudiante ve durante el proceso de biometría. Guía al usuario paso a paso para tomar tres fotos: carnet frontal, carnet trasero y selfie desde la webcam. Muestra instrucciones visuales en cada paso y envía las imágenes al backend al finalizar.

**Detalles técnicos:**
- Activa y gestiona la cámara del navegador con `navigator.mediaDevices.getUserMedia`.
- Usa un `<canvas>` para capturar el frame exacto de la webcam como imagen JPG.
- Envía las tres imágenes (como `File`) al servicio `verifyBiometrics` al presionar el botón de confirmar.

---

#### `src/services/biometriaService.js`
**¿Qué hace?**
Es el puente de comunicación entre el frontend y el backend para la biometría. Recibe los tres archivos de imagen y los empaqueta en un `FormData` para enviarlo al endpoint de la API.

**Detalles técnicos:**
- Hace un `POST` a `/api/biometria/verificar` con las imágenes como `multipart/form-data`.
- Retorna `{ verificado: boolean, datosEstudiante: object }` para que la pantalla decida si dejarlo pasar.

---

### ⚙️ BACKEND

---

#### `src/biometria/biometria.controller.ts`
**¿Qué hace?**
Es la puerta de entrada al sistema de biometría en el servidor. Recibe el request HTTP con las tres fotos y delega toda la lógica al Servicio.

**Detalles técnicos:**
- Expone el endpoint `POST /api/biometria/verificar`.
- Usa `FileFieldsInterceptor` de Multer para recibir `frontal`, `trasera` y `selfie` como archivos separados.
- Llama a `BiometriaService.validarIdentidad()` y retorna el resultado.

---

#### `src/biometria/dto/validar-identidad-archivos.dto.ts`
**¿Qué hace?**
Valida que los tres archivos de imagen lleguen correctamente antes de procesarlos. Es el guardián de los datos de entrada.

**Detalles técnicos:**
- Verifica que los tres campos (`frontal`, `trasera`, `selfie`) estén presentes.
- Valida que sean imágenes reales (`image/jpeg`, `image/png`, etc.).
- Define los límites de tamaño y donde guardar los archivos temporales en `/temp`.
- Si algo falla, lanza un `BadRequestException` claro antes de gastar recursos.

---

#### `src/biometria/biometria.service.ts` ⭐ (Archivo central)
**¿Qué hace?**
Es el cerebro de toda la verificación biométrica. Orquesta los tres pasos del proceso: leer el carnet con OCR, buscar al estudiante en el padrón y comparar su rostro.

**Los 3 pasos internos:**

**Paso 1 — OCR (Lectura del Carnet)**
- Recibe la foto frontal del carnet y la procesa con **Tesseract.js** (lector de texto local).
- Genera múltiples variantes de la imagen (escala de grises, alto contraste, recortes de zonas del CI) para maximizar la precisión.
- Si Tesseract no puede leer campos clave, llama a **Google Gemini AI** como respaldo OCR con sistema de reintentos automáticos (hasta 3 intentos ante errores 503).
- Extrae: Número de CI, Nombres y Apellidos.

**Paso 2 — Validación en Padrón**
- Con el CI extraído, busca al estudiante en la base de datos (`EstudiantesService`).
- Compara los nombres y apellidos del carnet con los del padrón usando **Distancia de Levenshtein** (tolerante a errores de OCR menores).

**Paso 3 — Face Match 1:1 (Reconocimiento Facial)**
- Carga los modelos de IA de la carpeta `/models` usando **`@vladmandic/face-api`** con motor **WebAssembly** (WASM).
- Procesa la foto frontal del carnet y la selfie con **Sharp** (normalización de color y canal Alpha).
- Extrae el **descriptor facial** (vector de 128 puntos matemáticos) de ambas imágenes usando `SsdMobilenetv1` + `FaceRecognitionNet`.
- Calcula la **Distancia Euclidiana** entre los dos descriptores.
  - ✅ Distancia < 0.6 → **Misma persona → VERIFICADO**
  - ❌ Distancia ≥ 0.6 → **Persona diferente → RECHAZADO**

**Variables de entorno relacionadas:**
| Variable | Descripción | Default |
|---|---|---|
| `BYPASS_BIOMETRIA_FACE_MATCH` | Salta el Face Match (para desarrollo rápido) | `false` |
| `BIOMETRIA_OCR_PROVIDER` | Motor OCR: `local`, `gemini`, `local_then_gemini` | `local_then_gemini` |
| `GEMINI_API_KEY` | Clave de la API de Gemini | — |
| `GEMINI_TIMEOUT_MS` | Tiempo máximo de espera a Gemini | `12000` |

---

#### `models/` (Carpeta de modelos de IA)
**¿Qué hace?**
Contiene los pesos pre-entrenados de las redes neuronales usadas para el reconocimiento facial.

| Carpeta | Red Neuronal | Función |
|---|---|---|
| `models/mobilenetv1/` | SsdMobilenetv1 | Detecta y localiza el rostro en la imagen |
| `models/faceLandmark68Net/` | FaceLandmark68Net | Mapea 68 puntos clave del rostro (ojos, nariz, boca) |
| `models/faceRecognitionNet/` | FaceRecognitionNet | Genera el vector de 128 dimensiones que representa el rostro |

---

## Flujo completo de interacción

```
ESTUDIANTE
    │
    │  Abre la pantalla de biometría
    ▼
CaptureFlow.jsx (Frontend)
    │  Activa la cámara web
    │  Guía al estudiante: Carnet Frontal → Carnet Trasero → Selfie
    │  Captura las 3 fotos como archivos JPG
    │
    │  POST FormData (frontal + trasera + selfie)
    ▼
biometriaService.js (Frontend)
    │  Empaqueta las imágenes en FormData
    │  POST /api/biometria/verificar
    ▼
BiometriaController (Backend)
    │  Multer guarda los archivos en /temp
    │  Valida que los 3 archivos existan y sean imágenes válidas
    │  Delega a BiometriaService.validarIdentidad()
    ▼
BiometriaService — PASO 1: OCR
    │  Sharp preprocesa la imagen del carnet (escala grises, contraste, zoom)
    │  Tesseract.js lee el texto del carnet
    │  [Si falla] → Gemini AI lee el carnet (con reintentos)
    │  Extrae: CI, Nombres, Apellidos
    ▼
BiometriaService — PASO 2: Padrón
    │  EstudiantesService.buscarEstudiantePorCi(ci)
    │  Compara nombres/apellidos con Levenshtein (tolerancia OCR)
    │  [Si no coincide] → BadRequestException
    ▼
BiometriaService — PASO 3: Face Match
    │  Carga modelos WASM (SsdMobilenetv1 + FaceLandmark68 + FaceRecognitionNet)
    │  Sharp convierte carnet frontal → tensor RGB
    │  FaceAPI extrae descriptor facial del carnet (128 puntos)
    │  Sharp convierte selfie → tensor RGB
    │  FaceAPI extrae descriptor facial de la selfie (128 puntos)
    │  Calcula Distancia Euclidiana entre los dos descriptores
    │  Distancia < 0.6 → MATCH ✅ | Distancia ≥ 0.6 → RECHAZO ❌
    ▼
BiometriaController
    │  Retorna { verificado: true, datosEstudiante: {...} }
    ▼
biometriaService.js (Frontend)
    │  Recibe { verificado, datosEstudiante }
    ▼
CaptureFlow.jsx (Frontend)
    └─→ Si verificado → Redirige al módulo de Votación
    └─→ Si rechazado → Muestra mensaje de error al estudiante
```
