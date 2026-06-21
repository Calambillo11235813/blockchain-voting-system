const hre = require("hardhat");

async function main() {
  console.log("Compilando y desplegando contrato Votacion...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Desplegando con la cuenta:", deployer.address);

  const Votacion = await hre.ethers.getContractFactory("Votacion");
  const votacion = await Votacion.deploy();
  await votacion.waitForDeployment();

  const contractAddress = await votacion.getAddress();

  console.log("");
  console.log("Contrato Votacion desplegado exitosamente.");
  console.log("VOTACION_CONTRACT_ADDRESS=" + contractAddress);
  console.log("");
  console.log("Copia la direccion anterior en tu archivo .env del backend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
