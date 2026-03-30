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
 ├── /estudiantes    # Gestión del padrón (Whitelist) y verificación biométrica (HU-001, HU-005)
 ├── /elecciones     # Frentes, candidatos y periodos de votación (HU-003, HU-004)
 ├── /blockchain     # Conexión exclusiva con los Smart Contracts y red descentralizada
 └── /common         # Herramientas compartidas (decoradores, guards, filtros, utilidades)

Cohesión Interna: Cada módulo (por ejemplo, /elecciones) debe contener internamente sus propios componentes: elecciones.controller.ts, elecciones.service.ts, elecciones.module.ts, y subcarpetas para sus /dto y /entities.

Aislamiento de la Blockchain: El módulo /blockchain es el único autorizado para interactuar directamente con la red externa (ej. Web3.js, Ethers.js). Si el módulo de /elecciones necesita registrar un voto, debe inyectar y llamar al servicio del módulo /blockchain, nunca hacerlo directamente.

Seguridad Centralizada: El módulo /auth actúa como guardián. Aquí se manejan los Guards de NestJS para proteger las rutas y verificar si el usuario tiene rol de Administrador o Estudiante antes de permitir que la petición llegue a los demás controladores.

Separación de Responsabilidades: * Los Controladores (.controller.ts) solo manejan peticiones HTTP (req/res) y llaman a los servicios.

Los Servicios (.service.ts) contienen la lógica de negocio pura y consultas a la base de datos.

nombres de carpetas y archivos en español porfas
