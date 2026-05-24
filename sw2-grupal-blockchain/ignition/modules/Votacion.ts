import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VotacionModule = buildModule("VotacionModule", (m) => {
  // El nuevo contrato no necesita candidatos en el constructor.
  // Los candidatos se gestionan exclusivamente en la base de datos (PostgreSQL).
  // El contrato solo registra votos usando hashes de UUIDs.
  const votacion = m.contract("Votacion", []);

  return { votacion };
});

export default VotacionModule;