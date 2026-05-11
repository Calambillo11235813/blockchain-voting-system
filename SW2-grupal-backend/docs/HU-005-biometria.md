# HU-005 — Integración de Validación Biométrica

Permite que el sistema verifique la identidad real del estudiante antes de emitir un voto.
Se usan tres imágenes: foto frontal del carnet, foto trasera del carnet y una selfie tomada en tiempo real.

---

## Stack Tecnológico

### 🧠 Inteligencia Artificial y Visión por Computadora

| Tecnología | Versión | Rol en el sistema |
|---|---|---|
| **`@vladmandic/face-api`** | v1.7.15 | Motor de detección y reconocimiento facial. Envuelve los modelos TensorFlow con una API de alto nivel. |
| **`@tensorflow/tfjs`** | v4.x | Motor de cómputo matemático base sobre el que corre face-api. |
| **`@tensorflow/tfjs-backend-wasm`** | v4.x | Backend de inferencia **WebAssembly** (WASM): permite correr los modelos de IA directamente en el servidor Node.js sin necesidad de GPU ni compilación nativa (C++). |
| **`sharp`** | v0.34.x | Procesamiento de imágenes de alta performance: conversión de espacio de color, normalización, contraste, zoom y extracción de regiones antes de pasarlas a los modelos. |
| **`tesseract.js`** | v7.x | Motor OCR (Reconocimiento Óptico de Caracteres) local para leer texto del carnet. No requiere internet. |
| **Google Gemini AI** | `gemini-2.5-flash` | API de IA multimodal de Google. Se usa como motor OCR inteligente que analiza la imagen completa del carnet y devuelve los campos estructurados (CI, Nombres, Apellidos) en formato JSON. |

---

### 🤖 Modelos Preentrenados de Reconocimiento Facial

Los tres modelos a continuación son redes neuronales profundas (**Deep Neural Networks**) entrenadas con millones de rostros humanos. Sus pesos están almacenados localmente en la carpeta `/models` del servidor y se cargan en memoria al inicio de cada verificación.

#### 1. `SSD MobileNet V1` — Detector de Rostros
| Propiedad | Valor |
|---|---|
| **Carpeta** | `models/mobilenetv1/` |
| **Arquitectura** | Single Shot MultiBox Detector (SSD) + MobileNet V1 |
| **Función** | Escanea la imagen completa y localiza la posición exacta del rostro humano (bounding box). |
| **Entrada** | Imagen RGB de cualquier tamaño |
| **Salida** | Coordenadas del rectángulo que encierra el rostro + score de confianza |
| **Umbral usado** | `minConfidence: 0.5` — descarta posibles falsos positivos con menos del 50% de certeza |
| **¿Por qué MobileNet?** | Es una arquitectura ligera diseñada para inferencia en dispositivos con recursos limitados. Ideal para un servidor sin GPU. |

---

#### 2. `Face Landmark 68 Net` — Detector de Puntos Clave del Rostro
| Propiedad | Valor |
|---|---|
| **Carpeta** | `models/faceLandmark68Net/` |
| **Arquitectura** | Red Neuronal Convolucional (CNN) ligera |
| **Función** | A partir del rostro detectado por SSD, localiza **68 puntos anatómicos** del rostro: bordes de los ojos, cejas, nariz, boca, mandíbula y contorno facial. |
| **Entrada** | Recorte del rostro detectado |
| **Salida** | Array de 68 coordenadas `(x, y)` que mapean la geometría del rostro |
| **¿Para qué sirve?** | Sus puntos son usados por el siguiente modelo para alinear y normalizar el rostro antes de generar el vector de identidad, mejorando significativamente la precisión. |

Los 68 puntos se distribuyen así:
- Puntos 0–16: Contorno de la mandíbula
- Puntos 17–26: Cejas
- Puntos 27–35: Nariz
- Puntos 36–47: Ojos
- Puntos 48–67: Boca

---

#### 3. `Face Recognition Net` — Generador de Embeddings Faciales
| Propiedad | Valor |
|---|---|
| **Carpeta** | `models/faceRecognitionNet/` |
| **Arquitectura** | ResNet-34 modificada (similar a la usada en la investigación de DeepFace/FaceNet) |
| **Función** | El modelo más importante. Convierte un rostro en un **vector numérico de 128 dimensiones** (embedding) que actúa como "huella digital matemática" del rostro. |
| **Entrada** | Rostro normalizado (alineado por los landmarks del modelo anterior) |
| **Salida** | `Float32Array` de 128 valores entre 0 y 1 |
| **¿Cómo funciona la comparación?** | Dos imágenes del mismo rostro producirán embeddings muy similares (vectores "cercanos"). Rostros diferentes producirán vectores "lejanos". |

**Métrica de comparación usada — Distancia Euclidiana:**

```
Distancia = √ Σ (embedding_carnet[i] - embedding_selfie[i])²
```

| Resultado | Rango de distancia | Interpretación |
|---|---|---|
| ✅ MISMO ROSTRO | `< 0.6` | Los vectores son suficientemente similares → misma persona |
| ❌ ROSTRO DIFERENTE | `≥ 0.6` | Los vectores son demasiado distintos → persona diferente |

> 🔬 **Nota académica:** El umbral de `0.6` es el valor estándar recomendado en la literatura de reconocimiento facial para el modelo ResNet-34. Valores más bajos (ej. `0.5`) aumentan la seguridad pero pueden generar más falsos negativos. Valores más altos (ej. `0.7`) son más permisivos pero aumentan el riesgo de suplantación.

---

### ⚙️ Estrategia de OCR — Modos de operación

El sistema soporta 4 modos de operación para el OCR, configurables mediante la variable de entorno `BIOMETRIA_OCR_PROVIDER`:

| Modo | Descripción | Velocidad | Resiliencia |
|---|---|---|---|
| `gemini_then_local` ⭐ | Gemini primero (~2s). Si falla → Tesseract local de respaldo. | Rápida | Máxima |
| `gemini` | Solo Gemini. Sin respaldo offline. | Muy rápida | Media |
| `local_then_gemini` | Tesseract primero (~15s). Si falla → Gemini. | Lenta | Alta |
| `local` | Solo Tesseract. Sin internet requerido. | Lenta | Alta offline |

**Modo activo en producción:** `gemini_then_local`

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
