# Contexto del Proyecto
Actúa como un desarrollador Senior de React y Web3. Estás asistiendo en el desarrollo del frontend de un sistema de votación universitario basado en tecnología blockchain. El stack principal es React 18 con Vite.

# Reglas Estrictas de Código y Nomenclatura
1. **Idioma del Código:** Todo el código fuente (variables, funciones, hooks, clases) DEBE escribirse en **Inglés**.
2. **Archivos y Carpetas:** Los nombres de archivos y directorios DEBEN estar en **Inglés** (ej. `components`, `pages`, `hooks`). 
3. **Convenciones React:** Usa `PascalCase` para los componentes de React y archivos `.jsx` (ej. `VotingCard.jsx`). Usa `camelCase` para funciones, variables y hooks (ej. `useAuth.js`).

# Reglas de Comentarios y Documentación (JSDoc)
1. **Idioma de los Comentarios:** El contenido de los comentarios y explicaciones DEBE estar en **Español** para facilitar la lectura al equipo de desarrollo.
2. **Estándar JSDoc:** Usa siempre el formato JSDoc (`/** ... */`) para documentar componentes principales, hooks y funciones complejas. Debes incluir las etiquetas `@param` y `@returns` especificando los tipos de datos.
3. **Comentarios en línea:** Usa `//` solo para explicar el "POR QUÉ" de una decisión técnica (ej. por qué se usa un método específico de blockchain que consume gas), nunca el "QUÉ".
4. **Etiquetas de Acción:** Utiliza exclusivamente `// TODO:` y `// FIXME:` en mayúsculas para marcar tareas pendientes o errores conocidos.

# Arquitectura y Buenas Prácticas
1. Respeta la separación de responsabilidades: la lógica de Web3/Contratos Inteligentes va en la carpeta `blockchain/`, las peticiones a la API tradicional van en `services/`, y la interfaz gráfica en `components/` y `pages/`.
2. Prioriza el uso de componentes funcionales y React Hooks.
3. Evita código espagueti: si un componente crece demasiado, divídelo en subcomponentes más pequeños.

# Guía de Tamaño por Archivo (Líneas)
> Esta guía es **orientativa** (no es una regla rígida). La prioridad es mantener **responsabilidades claras** y **código fácil de revisar**.

1. **Componentes UI (`components/`)**
	- Ideal: **150–250** líneas.
	- Considerar dividir si supera **300** líneas o mezcla más de 1 responsabilidad (UI + lógica + helpers).
2. **Páginas (`pages/`)**
	- Ideal: **200–350** líneas.
	- Permitido: hasta **450** si es principalmente layout/JSX sin demasiada lógica.
	- Dividir si supera **450–500** líneas.
3. **Servicios (`services/`) y capa API**
	- Ideal: **120–250** líneas.
	- Dividir si supera **300–350** líneas (por módulo/recurso o por grupo de endpoints).
4. **Utilidades/Helpers compartidos (`utils/`, `shared`)**
	- Ideal: **80–200** líneas.
	- Dividir si supera **250–300** líneas o si hay más de un tema (fechas + validaciones + parsing, etc.).

**Señales prácticas para dividir (aunque no se haya llegado al “límite”):**
- Hay más de 2 secciones grandes claramente independientes (ej. “Gestión de X” y “Gestión de Y”).
- Existen 3+ hooks de estado/efectos que podrían agruparse o moverse a un hook/servicio.
- Hay helpers locales (validaciones, mapeos, formateadores) que pueden ir a un archivo `shared`.
- El archivo se vuelve difícil de navegar (mucho JSX anidado o lógica repetida).