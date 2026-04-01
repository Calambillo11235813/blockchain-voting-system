# Documentación del Sistema de Votación Universitaria con Blockchain

## 1. Contexto del Proyecto
Este documento sirve como base de conocimiento y contexto principal para el desarrollo del sistema. 

El proyecto es un Taller de Grado enfocado en diseñar e implementar un sistema de votación electrónica descentralizada utilizando tecnología Blockchain, específicamente adaptado para los procesos electorales universitarios de la AUGRM.

### Descripción del Sistema
El sistema busca resolver los problemas de transparencia, seguridad y logística en las elecciones estudiantiles. Al utilizar Blockchain, garantizamos que cada voto emitido sea inmutable, auditable públicamente y resistente a manipulaciones, manteniendo al mismo tiempo el absoluto secreto del voto.

La arquitectura requiere un alto nivel de seguridad en la capa de identidad. Para lograrlo, el sistema implementa un proceso de validación de dos pasos para los electores:
1.  **Validación Institucional:** Verificación de las credenciales universitarias contra una lista de estudiantes habilitados (Whitelist).
2.  **Validación Biométrica:** Confirmación de la identidad física del estudiante (facial/huella) justo antes de la emisión del voto en la blockchain, para evitar cualquier tipo de suplantación de identidad.

Los administradores (Corte Electoral) tendrán herramientas para gestionar el ciclo de vida completo de la elección: desde el registro de frentes estudiantiles y la carga del padrón, hasta la apertura, cierre y escrutinio automatizado a través de Contratos Inteligentes (Smart Contracts).

---

## 2. Sprint 1: Fundamentos de Identidad y Configuración Electoral

**Objetivo del Sprint:** Establecer los cimientos del sistema permitiendo la configuración inicial de la elección por parte del administrador y garantizando un acceso seguro y validado para los estudiantes.

### Historias de Usuario

| ID | Rol | Quiero... | Para... |
| :--- | :--- | :--- | :--- |
| **HU-001** | Administrador | Cargar la lista predefinida de estudiantes (Whitelist). | Asegurar que solo estudiantes habilitados participen en la elección. |
| **HU-002** | Estudiante | Iniciar sesión con credenciales universitarias. | Validar mi identidad básica en la plataforma. |
| **HU-003** | Administrador | Registrar a los candidatos y frentes estudiantiles. | Configurar la papeleta digital correctamente. |
| **HU-004** | Administrador | Iniciar y finalizar el periodo de votación. | Controlar los tiempos de apertura y cierre de las urnas digitales. |
| **HU-005** | Estudiante | Realizar verificación biométrica (facial/huella). | Garantizar que el voto sea emitido por mi persona y evitar la suplantación de identidad. |

---
## 3. Arquitectura y Estructura del Backend (NestJS Modular)

Para aprovechar al máximo el poder del framework NestJS y mantener un código altamente escalable, este proyecto utiliza una **Arquitectura Modular**. Cada dominio de negocio está encapsulado en su propio módulo independiente, agrupando sus controladores, servicios, entidades y validaciones.

La estructura base dentro del directorio `src/` es la siguiente:

```text
/src
 ├── /auth           # Autenticación, JWT, y validación de credenciales (HU-002)
 ├── /blockchain     # Conexión exclusiva con los Smart Contracts y red descentralizada
 ├── /common         # Herramientas compartidas (decoradores, guards, filtros, utilidades)
 ├── /config         # Configuración global y gestión de variables de entorno (.env)
 ├── /elecciones     # Frentes, candidatos y periodos de votación (HU-003, HU-004)
 ├── /estudiantes    # Gestión del padrón (Whitelist) y verificación biométrica (HU-001, HU-005)
 └── /seed           # Scripts de poblado de base de datos inicial (Whitelist y Admin)

Cohesión Interna: Cada módulo (por ejemplo, /elecciones) debe contener internamente sus propios componentes: elecciones.controller.ts, elecciones.service.ts, elecciones.module.ts, y subcarpetas para sus /dto y /entities.

Aislamiento de la Blockchain: El módulo /blockchain es el único autorizado para interactuar directamente con la red externa (ej. Web3.js, Ethers.js). Si el módulo de /elecciones necesita registrar un voto, debe inyectar y llamar al servicio del módulo /blockchain, nunca hacerlo directamente.

Seguridad Centralizada: El módulo /auth actúa como guardián. Aquí se manejan los Guards de NestJS para proteger las rutas y verificar si el usuario tiene rol de Administrador o Estudiante antes de permitir que la petición llegue a los demás controladores.

Separación de Responsabilidades: * Los Controladores (.controller.ts) solo manejan peticiones HTTP (req/res) y llaman a los servicios.

Los Servicios (.service.ts) contienen la lógica de negocio pura y consultas a la base de datos.


nombres de carpetas y archivos en español porfa


## 4. Estándares de Codificación (Guía estricta para Copilot)

Para mantener la calidad y consistencia en toda la base de código, el desarrollo de este backend debe adherirse estrictamente a las siguientes convenciones de NestJS y TypeScript:

## 4.1. Convenciones de Nomenclatura (Naming Conventions)
* **Archivos:** Utilizar `kebab-case` seguido del tipo de archivo. 
  * *Ejemplos:* `estudiantes.controller.ts`, `crear-frente.dto.ts`, `jwt-auth.guard.ts`.
* **Clases, DTOs e Interfaces:** Utilizar `PascalCase`. 
  * *Ejemplos:* `EstudiantesService`, `CrearVotoDto`, `AuthPayload`.
* **Variables y Métodos:** Utilizar `camelCase`. 
  * *Ejemplos:* `obtenerEstudiantePorId()`, `estudianteHabilitado`.
* **Constantes y Variables de Entorno:** Utilizar `UPPER_SNAKE_CASE`. 
  * *Ejemplos:* `JWT_SECRET`, `MAX_INTENTOS_LOGIN`.

### 4.2. Tipado y TypeScript (Strict Mode)
* **Prohibido el uso de `any`:** Bajo ninguna circunstancia se debe usar `any`. Todo dato entrante o saliente debe estar tipado explícitamente mediante DTOs, Entidades o Interfaces.
* **Retornos explícitos:** Todos los métodos en controladores y servicios deben declarar qué tipo de dato retornan, incluyendo el uso de `Promise<T>` para funciones asíncronas.

### 4.3. Reglas de Capas y Validaciones
* **Controladores Delgados (Thin Controllers):** Los controladores tienen estrictamente prohibido contener lógica de negocio (condicionales complejos, bucles, cálculos). Su única función es recibir la petición (`@Body()`, `@Param()`, `@Query()`), llamar al método correspondiente del servicio y retornar la respuesta.
* **Validación de Entrada (DTOs):** Toda petición que envíe datos (POST, PUT, PATCH) debe pasar por un Data Transfer Object (DTO). Se deben usar los decoradores de `class-validator` (ej. `@IsString()`, `@IsUUID()`, `@IsNotEmpty()`) para validar los datos antes de que lleguen al controlador.
* **Inyección de Dependencias:** Siempre se debe utilizar el constructor para inyectar dependencias (servicios, repositorios). Ej: `constructor(private readonly estudiantesService: EstudiantesService) {}`.

### 4.4. Manejo de Errores
* **Excepciones de NestJS:** Prohibido lanzar errores genéricos (`throw new Error()`). Se deben utilizar exclusivamente las excepciones HTTP nativas de NestJS según el contexto.
  * *Ejemplos:* `NotFoundException` (404), `UnauthorizedException` (401), `BadRequestException` (400), `ConflictException` (409).

### 4.5. Estándar de Comentarios (JSDoc)
* **Documentación de Métodos:** Todas las clases, métodos públicos en servicios (`.service.ts`) y endpoints en controladores (`.controller.ts`) deben estar documentados estrictamente utilizando el formato **JSDoc** (`/** ... */`).
* **Etiquetas Obligatorias:** Todo método debe incluir una descripción breve, seguida de las etiquetas `@param` para cada parámetro, `@returns` para describir el valor de retorno, y `@throws` si la función emite alguna excepción.
* **Comentarios Internos:** Utilizar `//` de forma minimalista. Solo deben usarse para explicar el "por qué" de una lógica de negocio compleja o decisiones de arquitectura, nunca para explicar código que es evidente (Clean Code).