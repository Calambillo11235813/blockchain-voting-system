# Modelos para verificación facial (HU-005)

Este backend usa `@vladmandic/face-api` para Face Match. Para que funcione, esta carpeta debe contener los modelos (archivos manifest `*.json` + shards `*-shard*`) compatibles con:

- `mobilenetv1` (detección: `ssdMobilenetv1`)
- `faceLandmark68Net`
- `faceRecognitionNet`

## Estructura requerida

La carga se realiza desde [src/biometria/biometria.service.ts](../src/biometria/biometria.service.ts) usando `loadFromDisk()` en estas rutas:

- `models/mobilenetv1/`
- `models/faceLandmark68Net/`
- `models/faceRecognitionNet/`

Dentro de cada carpeta deben existir el manifest `*-weights_manifest.json` y sus shards.

## Nombres típicos

Coloca aquí los manifests y pesos típicamente nombrados así (los nombres exactos dependen del bundle de modelos que uses):

- `ssd_mobilenetv1_model-weights_manifest.json` + `ssd_mobilenetv1_model-shard*`
- `face_landmark_68_model-weights_manifest.json` + `face_landmark_68_model-shard*`
- `face_recognition_model-weights_manifest.json` + `face_recognition_model-shard*`

## Nota

Si faltan modelos o no coinciden los nombres esperados, el endpoint `POST /biometria/verificar` responderá con error indicando que no pudo cargar los modelos desde `/models`.
