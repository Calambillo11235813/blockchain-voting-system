# Registro de Errores y Soluciones Implementadas

Este documento detalla los problemas recientes encontrados durante el flujo de inicio de sesión, votación y redirección post-voto, junto con las soluciones aplicadas para resolverlos.

## 1. Bloqueo al intentar iniciar sesión después de haber votado
**Problema:**
El backend arrojaba un `ForbiddenException: El elector ya ejerció su voto en esta elección` directamente en el proceso de Login. Esto impedía que un usuario que ya había emitido su voto pudiera volver a ingresar al sistema para revisar estadísticas o descargar su certificado.

**Solución:**
Se removió la "Validación 4: Doble Voto" dentro del método de inicio de sesión (`validarAccesoVotante` en `padron.service.ts`). La seguridad criptográfica contra el doble voto sigue intacta al momento de emitir el voto real, pero ahora el sistema permite loguearse. El frontend se encarga de redirigir al elector a la vista correspondiente si ya sufragó.

## 2. Redirección incorrecta y error de `.length` ("Cannot read properties of undefined")
**Problema:**
El usuario reportó un error en consola: `jgnhj6hn8.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'length')` y se quejaba de ser redirigido a la pantalla de "Verificación de Identidad" (Biometría) en lugar del Dashboard Post-Votación.

**Causa:**
En `Login.jsx`, la lógica verificaba si el elector ya había votado y, en caso afirmativo, le asignaba la ruta `nextPath = '/estudiante/papeleta'`. Sin embargo, la ruta real definida en `AppRoutes.jsx` era `/estudiante/votacion`.
Al no existir la ruta `/estudiante/papeleta`, el Router ("*") mandaba al usuario de vuelta, lo que rompía el flujo, forzando la redirección por defecto a Biometría, y dejando el estado de los componentes corrompido, lo que originaba el error de lectura `.length`.

**Solución:**
Se corrigió la ruta de redirección en `Login.jsx` cambiando `/estudiante/papeleta` por `/estudiante/votacion`.

## 3. Error de compilación en Backend: `Cannot redeclare block-scoped variable 'eleccion'`
**Problema:**
Al reiniciar el backend, TypeScript detectó la declaración repetida de la variable `eleccion` en el archivo `certificado.service.ts`.

**Solución:**
Se eliminó la segunda declaración redundante dentro de `generarCertificadoPDF()`, reemplazándola correctamente para obtener los datos del elector desde el registro de sufragio.

## 4. Visualización de Estadísticas en Vivo para Elector (Post-Voto)
**Requisito Implementado:**
Se solicitó que, una vez que el Estudiante o Docente emitiera su voto, o si re-inicia sesión posteriormente, no deba volver a ver la papeleta, sino directamente el **Dashboard de Estadísticas en Vivo** divididas por su propio rol.

**Solución:**
Se actualizó `VotingBallot.jsx` para que evalúe si el usuario `haVotado`. Si la respuesta es verdadera, el componente invoca la API para obtener los datos (`getEstadisticasDocentes` o `getEstadisticasEstudiantes` dependiendo del rol) y renderiza las tarjetas de estadísticas con los porcentajes de participación y votos totales. Además, en el login se integró la llamada a `verificarEstadoVoto()` para asegurar que se tome el flujo de post-votación correcto al ingresar de nuevo a la plataforma.
