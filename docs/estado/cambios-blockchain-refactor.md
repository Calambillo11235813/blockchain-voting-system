# Estado de Refactorización Blockchain (Sincronización Backend - Smart Contract)

**Fecha**: 2026-05-22
**Objetivo**: Resolver la desincronización y el problema de los candidatos hardcodeados en el Smart Contract, convirtiendo a la base de datos (PostgreSQL) en la única fuente de la verdad para la gestión de candidatos y utilizando la blockchain exclusivamente como un libro contable inmutable de votos mediante el uso de hashes.

## El Problema Original
La arquitectura inicial presentaba un problema de sincronización grave:
1. Al desplegar el contrato `Votacion.sol`, los nombres de los candidatos se inicializaban de forma rígida en el constructor (ej. "Alice", "Bob").
2. El sistema Backend permitía crear, actualizar y eliminar candidatos de forma dinámica usando UUIDs, almacenándolos en PostgreSQL.
3. En el momento de emitir un voto en `VotoService`, el backend realizaba una "búsqueda heurística" insegura por nombre o sigla tratando de adivinar el índice numérico que correspondía al candidato en el arreglo del Smart Contract. Si fallaba, se registraba el voto al índice 0 por defecto.

Esto no solo era frágil sino que requería hacer un nuevo deploy del contrato entero para cada elección y no respetaba la integridad referencial.

## La Solución Implementada
Se rediseñó la interacción para que **el Smart Contract no sepa absolutamente nada sobre candidatos, nombres, frentes o elecciones específicas**. El contrato fue reducido a un registro inmutable de pares clave-valor asegurado criptográficamente.

### 1. Smart Contract (`Votacion.sol`)
- Se eliminó el almacenamiento de candidatos.
- Ahora, la función `votar` recibe `bytes32` (hashes) de: `eleccionId`, `candidatoId` y `electorId`.
- El contrato previene el doble voto mapeando el hash de la elección y del elector `mapping(bytes32 => mapping(bytes32 => bool)) public yaVoto;`.
- Los votos se suman al candidato usando `mapping(bytes32 => mapping(bytes32 => uint256)) public votos;`.
- Se agregó el modificador `soloAdmin` para que **únicamente** la billetera institucional del backend pueda escribir transacciones, mejorando la seguridad.
- Ahora un único contrato desplegado puede servir para cientos de elecciones simultáneamente.

### 2. Backend - `BlockchainService`
- Fue actualizado para soportar el nuevo ABI del contrato.
- El método `registrarVoto` ahora aplica la función de hash `ethers.keccak256(ethers.toUtf8Bytes(uuid))` a los tres IDs y los envía al contrato.
- Se agregó el método `obtenerVotos(eleccionId, candidatoId)` que permite consultar los votos usando el hash.

### 3. Backend - `VotoService`
- **Se eliminó toda la lógica frágil y de fallback.**
- Ahora obtiene directamente el ID del `frente` (ya que la ponderación paritaria en la Universidad se hace sobre el Frente) y envía los tres UUIDs a la blockchain.

### 4. Backend - `EscrutinioService`
- Antes, consultaba la lista completa de candidatos desde la blockchain (que traía nombres string) y trataba de mapearlos.
- Ahora, directamente itera sobre los frentes guardados en PostgreSQL y consulta a la blockchain cuántos votos tiene el `frente.id` para la elección actual.

### 5. Backend - Limpieza de Controladores
- Se eliminaron los endpoints de prueba e innecesarios `GET /blockchain/candidatos` y `POST /blockchain/votar` del `CandidatoController`, así como el código muerto en `CandidatoService`.

## ¿Qué sigue?
- Al desplegar el frontend o probar las llamadas al backend, el sistema es completamente agnóstico al contrato desplegado (se despliega vacío, una única vez en su historia).
- Al crear una nueva elección, ya no es necesario invocar a Hardhat, simplemente se crea en BD y los votos se registrarán automáticamente en el contrato universal usando sus respectivos hashes.
