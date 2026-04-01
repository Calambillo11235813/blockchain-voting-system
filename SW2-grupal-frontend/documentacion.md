# SW2 Grupal - Frontend (Sistema de Votación Blockchain)

Este es el frontend del sistema de votación, construido con React y Vite. Se encarga de la interfaz de usuario, la conexión con el backend para la validación de estudiantes y la interacción directa con los contratos inteligentes en la blockchain.

## 🚀 Tecnologías Principales
* **Framework:** React 18 + Vite
* **Lenguaje:** JavaScript / JSX
* **Estilos:**  TailwindCSS
* **Web3:** [Aquí pondremos Ethers.js o Web3.js]
* **Peticiones HTTP:** Axios (para conectar con `sw2-grupal-backend`)

## ⚙️ Instalación y Ejecución

1. Clonar el repositorio.
2. Instalar las dependencias:
   ```bash
   npm install

### 2. Estructura de carpetas sugerida para `/src`
Para un sistema de votación descentralizado, necesitas separar muy bien lo que es visual, lo que habla con tu backend normal y lo que habla con la blockchain. Te sugiero armar tu carpeta `src` de la siguiente manera:

```text
src/
├── assets/         # Imágenes, logos de la universidad, íconos y CSS global.
├── blockchain/     # ¡Crucial! Aquí irán los ABIs de tus Smart Contracts y la configuración de Ethers/Web3.
├── components/     # Componentes UI reutilizables (Botones, Tarjetas de candidatos, Modales de confirmación).
├── context/        # Estados globales (ej. AuthContext para saber si el usuario está logueado, Web3Context para su wallet).
├── hooks/          # Hooks personalizados (ej. useVotacion, useMetaMask).
├── pages/          # Las vistas completas (Login, PanelEstudiante, PantallaVotacion, Resultados).
├── routes/         # Configuración de las rutas (React Router).
├── services/       # Peticiones a tu "sw2-grupal-backend" (validar credenciales, obtener listas).
├── utils/          # Funciones de ayuda (formatear fechas, acortar direcciones de wallets: 0x123...abc).
├── App.jsx         # Componente raíz donde inyectas rutas y contextos.
└── main.jsx        # Punto de entrada de la aplicación.


### 3. Sprint 1: Fundamentos de Identidad y Configuración Electoral

**Objetivo del Sprint:** Establecer los cimientos del sistema permitiendo la configuración inicial de la elección por parte del administrador y garantizando un acceso seguro y validado para los estudiantes.

### Historias de Usuario

| ID | Rol | Quiero... | Para... |
| :--- | :--- | :--- | :--- |
| **HU-001** | Administrador | Cargar la lista predefinida de estudiantes (Whitelist). | Asegurar que solo estudiantes habilitados participen en la elección. |
| **HU-002** | Estudiante | Iniciar sesión con credenciales universitarias. | Validar mi identidad básica en la plataforma. |
| **HU-003** | Administrador | Registrar a los candidatos y frentes estudiantiles. | Configurar la papeleta digital correctamente. |
| **HU-004** | Administrador | Iniciar y finalizar el periodo de votación. | Controlar los tiempos de apertura y cierre de las urnas digitales. |
| **HU-005** | Estudiante | Realizar verificación biométrica (facial/huella). | Garantizar que el voto sea emitido por mi persona y evitar la suplantación de identidad. | 