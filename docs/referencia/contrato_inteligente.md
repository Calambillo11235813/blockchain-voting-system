# CU-03: Desplegar Smart Contracts desde el Panel de Admin

## Contexto

Actualmente el contrato `Votacion.sol` se despliega manualmente desde la terminal con:
```bash
npx hardhat --network localhost ignition deploy ./ignition/modules/Votacion.ts
```

El objetivo es que el **admin de sistemas** pueda hacerlo desde el panel web, con trazabilidad y sin necesidad de la terminal.

---

## Cambios propuestos

### Backend — Servicio de despliegue

#### [MODIFY] [blockchain.service.ts](file:///d:/1.CARRERA%20UNIVERSITARIA/10.%20DECIMO%20PRIMER%20SEMESTRE/1.SW2/3.PROYECTO%20GRUPAL/PROYECTO%20BLOCKCHAIN/blockchain-voting-system/SW2-grupal-backend/src/blockchain/services/blockchain.service.ts)

Agregar dos métodos nuevos:

1. **`deployContract(privateKey)`** — Despliega el contrato `Votacion` usando `ethers.ContractFactory` con el ABI y bytecode del artefacto de Hardhat. Retorna la dirección del contrato desplegado y el hash de la transacción.

2. **`getContractInfo()`** — Consulta información del contrato actual: dirección, admin, totalVotosGlobal, código del contrato en la dirección (para verificar si existe), y la red conectada (chainId, nombre).

---

#### [NEW] deploy.controller.ts
**Path:** `src/blockchain/controllers/deploy.controller.ts`

Dos endpoints protegidos con `AuthGuard('jwt')` + `SistemasGuard`:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/blockchain/contract-info` | Info del contrato actual (dirección, admin, votos globales, red) |
| `POST` | `/admin/blockchain/deploy` | Despliega nuevo contrato. Usa la `PRIVATE_KEY` del `.env` del backend |

---

#### [MODIFY] [blockchain.module.ts](file:///d:/1.CARRERA%20UNIVERSITARIA/10.%20DECIMO%20PRIMER%20SEMESTRE/1.SW2/3.PROYECTO%20GRUPAL/PROYECTO%20BLOCKCHAIN/blockchain-voting-system/SW2-grupal-backend/src/blockchain/blockchain.module.ts)

Registrar el nuevo `DeployController`.

---

### Frontend — Página de despliegue

#### [NEW] DespliegueContratos.jsx
**Path:** `src/pages/admin/sistemas/DespliegueContratos.jsx`

Página con:
- **Panel de info del contrato actual**: dirección, admin wallet, total votos globales, red conectada (chainId), estado (si tiene código desplegado o no)
- **Botón "Desplegar nuevo contrato"**: con modal de confirmación (acción irreversible — el contrato anterior queda huérfano)
- **Log de resultado**: muestra dirección nueva, hash de la tx de deploy

#### [NEW] deployService.js
**Path:** `src/services/deployService.js`

Funciones: `getContractInfo()` y `deployContract()`

---

#### [MODIFY] [AppRoutes.jsx](file:///d:/1.CARRERA%20UNIVERSITARIA/10.%20DECIMO%20PRIMER%20SEMESTRE/1.SW2/3.PROYECTO%20GRUPAL/PROYECTO%20BLOCKCHAIN/blockchain-voting-system/SW2-grupal-frontend/src/routes/AppRoutes.jsx)

Agregar ruta `/admin/despliegue-contratos` → `<DespliegueContratos />`

#### [MODIFY] [DashboardSistemas.jsx](file:///d:/1.CARRERA%20UNIVERSITARIA/10.%20DECIMO%20PRIMER%20SEMESTRE/1.SW2/3.PROYECTO%20GRUPAL/PROYECTO%20BLOCKCHAIN/blockchain-voting-system/SW2-grupal-frontend/src/pages/admin/sistemas/DashboardSistemas.jsx)

Habilitar la tarjeta CU-03: quitar `disabled: true` y poner la ruta `/admin/despliegue-contratos`.

---

## Cómo funcionaría en Sepolia Testnet

> [!IMPORTANT]
> Para producción/testnet, solo necesitas cambiar **2 variables de entorno** en el backend:

| Variable | Local (Hardhat) | Sepolia Testnet |
|---|---|---|
| `BLOCKCHAIN_RPC_URL` | `http://127.0.0.1:8545` | `https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY` |
| `PRIVATE_KEY` | La cuenta #0 de Hardhat | Tu wallet con SepoliaETH (la misma del `.env` del blockchain) |

El flujo sería:
1. Obtener SepoliaETH gratis de un **faucet** (ej: `sepoliafaucet.com`)
2. Configurar las variables en el `.env` del backend
3. El admin de sistemas entra al panel → "Desplegar Smart Contracts"
4. Hace clic en "Desplegar" → el backend usa `ethers.ContractFactory` para desplegar en Sepolia
5. La transacción tarda ~15 segundos (vs instantáneo en Hardhat local)
6. El contrato queda visible en [Sepolia Etherscan](https://sepolia.etherscan.io/)

> [!NOTE]
> El código es **exactamente el mismo** para local y Sepolia. La única diferencia son las variables de entorno. `ethers.js` se conecta al RPC que le indiques.

---

## Verificación

### Manual
- Entrar como admin de sistemas → la tarjeta "Desplegar Smart Contracts" ya no dice "Próximamente"
- Hacer clic → ver info del contrato actual (dirección, admin, red)
- Desplegar nuevo contrato → verificar que muestra la nueva dirección y hash
- Verificar que el contrato nuevo funciona (votar desde el flujo normal)
