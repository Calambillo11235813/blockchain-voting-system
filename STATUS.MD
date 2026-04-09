# Estado del Proyecto: Sistema de Votación Blockchain (UAGRM)

## 📌 Resumen Ejecutivo
**Desarrolladores:** Diogo Nicolas Rodriguez Gomez y Klaus Parada Burgos
**Entorno:** NestJS (Backend), PostgreSQL (Docker), Blockchain.
**Arquitectura:** Modular por Dominios.

## ✅ Funcionalidades Implementadas

### Sprint 1: Cimientos e Identidad
* **HU-001: Carga de Padrón Electoral (Whitelist)**
    * Implementada subida de archivos `.xlsx`.
    * Validación de campos: Registro, CI, Nombres, Apellidos, Correo, Carrera.
    * Persistencia en PostgreSQL mediante TypeORM.

    
* **HU-002: Autenticación de Estudiantes**
    * Inicio de sesión mediante Registro y Contraseña generada dinámicamente (Iniciales Apellidos + CI).
    * Emisión de Tokens JWT para sesiones seguras.
    * Validación de estado "Habilitado".

## 🛠 Arquitectura Técnica Actualizada
* **Módulos:** `auth`, `estudiantes`, `config`, `common`, `seed`.
* **Base de Datos:** PostgreSQL corriendo en contenedor Docker independiente.
* **Seguridad:** Encriptación con Bcrypt y protección de rutas con Passport JWT.

## 🚀 Próximos Pasos (Pendientes)
1.  **HU-003:** Registro de frentes y candidatos (Módulo `elecciones`).
2.  **HU-004 **,Administrador,Iniciar y finalizar el periodo de votación.,    
                Controlar los tiempos de apertura y cierre de urnas.,Alta,3
3.  **HU-005:** Integración de validación biométrica.
