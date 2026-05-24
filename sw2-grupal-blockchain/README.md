# SW2 Blockchain - Votacion (Hash-Based)

Contrato de votacion sin candidatos hardcodeados. El backend maneja los UUIDs y la blockchain solo registra hashes inmutables.

## Requisitos

- Node.js 18+ y pnpm

## Configuracion

Crea un archivo `.env` con:

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0x...
```

Para desarrollo local, no es necesario configurar estos valores si usas `hardhat node`.

## Instalacion

```
pnpm install
```

## Compilar y testear

```
pnpm run compile
pnpm test
```

## Comandos rapidos

```
pnpm run local-node
npx hardhat node
```

Ambos comandos hacen lo mismo: inician el nodo local de Hardhat.

## Deploy

### Red local (Hardhat)

Terminal 1:

```
pnpm run local-node
```

Nota: `pnpm run local-node` es un alias de `npx hardhat node`.

Terminal 2:

```
pnpm exec hardhat ignition deploy ./ignition/modules/Votacion.ts --network localhost
```

Nota: usar `pnpm exec hardhat` evita que `npx` instale Hardhat 3 (requiere Node 22).

### Sepolia

```
pnpm exec hardhat ignition deploy ./ignition/modules/Votacion.ts --network sepolia
```

Las direcciones desplegadas quedan en:

```
ignition/deployments/chain-<chainId>/deployed_addresses.json
```

El ABI se encuentra en:

```
artifacts/contracts/Votacion.sol/Votacion.json
```

## Integracion con el backend

- Copia la direccion del contrato a `VOTACION_CONTRACT_ADDRESS`.
- Usa el ABI generado por Hardhat en el servicio de blockchain.
- Hashea los UUIDs con `keccak256(toUtf8Bytes(uuid))` antes de llamar a `votar`.

## Microservicio de deploy (opcional)

El archivo `server/index.js` expone un endpoint simple para desplegar el contrato via Hardhat Ignition.

```
node server/index.js
```

Endpoint:

```
POST http://localhost:6969/deploy-votacion
```

Variables opcionales:

```
DEPLOY_NETWORK=sepolia
```

## Diagrama de flujo de deploy

```mermaid
flowchart TD
	A[Usuario / CI] --> B[Hardhat Ignition]
	B --> C[Votacion.sol]
	C --> D[Red (localhost o Sepolia)]
	D --> E[Direccion del contrato]
	E --> F[Backend config VOTACION_CONTRACT_ADDRESS]
	F --> G[Registro de votos via hashes]
```
