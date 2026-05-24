# Software de Votación Electrónica con Blockchain y Validación Biométrica

**Para la Corte Electoral Universitaria de la UAGRM**

## Descripción del Proyecto

El presente proyecto desarrolla un **sistema de gestión institucional centralizado** para automatizar los procesos electorales de la Universidad Autónoma Gabriel René Moreno (UAGRM). La solución integra dos tecnologías de vanguardia:

- **Blockchain (Cadena de Bloques):** Garantiza la inalterabilidad, transparencia y auditabilidad de cada sufragio mediante Smart Contracts.
- **Validación Biométrica Facial con IA:** Previene la suplantación de identidad comparando en tiempo real el rostro del elector con su documento de identidad.

El sistema es una **infraestructura tecnológica privada y soberana** para la Corte Electoral Universitaria, con un diseño web responsivo (mobile-first) que permite el voto remoto seguro desde cualquier dispositivo. Abarca desde la autenticación institucional hasta el escrutinio automatizado con ponderación paritaria (50% estudiantes – 50% docentes), eliminando riesgos de manipulación y reduciendo costos logísticos.

**Tecnologías clave:** NestJS (backend), React (frontend), PostgreSQL (base de datos relacional), Hardhat y Solidity (Blockchain), modelos de IA para reconocimiento facial y OCR.

---

## Actores del Sistema

| Actor | Descripción |
|-------|-------------|
| **Administrador de Sistemas** | Personal técnico con privilegios totales. Configura el entorno, gestiona los nodos Blockchain, despliega Smart Contracts y asegura la disponibilidad de APIs de biometría e IA. |
| **Administrador Electoral** | Personal de la Corte Electoral Universitaria. Gestiona el padrón, registra candidatos/frentes, controla la jornada (apertura/cierre) y supervisa el escrutinio. |
| **Elector** | Estudiante o docente habilitado. Se autentica con credenciales institucionales, se valida biométricamente, emite su voto y recibe un comprobante criptográfico (Hash). |
| **Auditor** | Veedor del proceso (delegado estamental o externo). Verifica la integridad de la red Blockchain, revisa firmas criptográficas y monitorea la transparencia del escrutinio. |

---

## Casos de Uso (20 en total)

| ID | Nombre del Caso de Uso |
|----|-------------------------|
| CU-01 | Gestionar cuentas administrativas |
| CU-02 | Configurar parámetros del sistema |
| CU-03 | Desplegar Smart Contracts |
| CU-04 | Administrar nodos de la red |
| CU-05 | Gestionar padrón electoral |
| CU-06 | Registrar candidaturas y frentes |
| CU-07 | Controlar jornada electoral |
| CU-08 | Autenticar usuario institucional |
| CU-09 | Controlar sesión única |
| CU-10 | Validar biometría facial |
| CU-11 | Extraer datos mediante OCR |
| CU-12 | Emitir voto digital |
| CU-13 | Registrar voto en Blockchain |
| CU-14 | Generar Hash de verificación |
| CU-15 | Monitorear participación en tiempo real |
| CU-16 | Visualizar estadísticas estudiantiles |
| CU-17 | Visualizar estadísticas docentes |
| CU-18 | Generar reporte de consolidación paritaria |
| CU-19 | Descargar certificado de sufragio |
| CU-20 | Auditar integridad de la red |

---

## Relación Actor – Casos de Uso

| Actor | Casos de Uso Asociados |
|-------|------------------------|
| **Administrador de Sistemas** || CU-01 (Gestionar cuentas administrativas), CU-02 (Configurar parámetros del sistema), CU-03 (Desplegar Smart Contracts), CU-04 (Administrar nodos de la red), CU-20 (Auditar integridad de la red)
| **Administrador Electoral** | CU-05 (Gestionar padrón electoral), CU-06 (Registrar candidaturas y frentes), CU-07 (Controlar jornada electoral), CU-15 (Monitorear participación en tiempo real), CU-16 (Visualizar estadísticas estudiantiles), CU-17 (Visualizar estadísticas docentes), CU-18 (Generar reporte de consolidación paritaria) |
| **Elector** | CU-08 (Autenticar usuario institucional), CU-09 (Controlar sesión única), CU-10 (Validar biometría facial), CU-11 (Extraer datos mediante OCR), CU-12 (Emitir voto digital), CU-13 (Registrar voto en Blockchain), CU-14 (Generar Hash de verificación), CU-19 (Descargar certificado de sufragio) |
| **Auditor** | CU-15 (Monitorear participación en tiempo real), CU-16 (Visualizar estadísticas estudiantiles), CU-17 (Visualizar estadísticas docentes), CU-20 (Auditar integridad de la red) |

> **Nota:** Algunos casos de uso (como monitoreo y estadísticas) son compartidos entre el Administrador Electoral y el Auditor, con diferentes niveles de privilegio.

---

## Resumen de Interacciones por Actor

- **Administrador de Sistemas:** Configuración técnica y mantenimiento de la infraestructura Blockchain.
- **Administrador Electoral:** Gestión del proceso electoral (padrón, candidatos, jornada, resultados).
- **Elector:** Flujo completo de votación (autenticación, biometría, emisión, comprobante).
- **Auditor:** Verificación de la transparencia e inmutabilidad de la red.

---

*Documento base: Taller de Grado I - INF511 (UAGRM, 2026)*