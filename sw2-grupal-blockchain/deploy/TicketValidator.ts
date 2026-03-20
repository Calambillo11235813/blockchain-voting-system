import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import * as hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Iniciando el despliegue de TicketValidator...");

    // Asegurarse de que la clave privada está configurada
    if (!process.env.PRIVATE_KEY) {
        throw new Error("Por favor configura PRIVATE_KEY en el archivo .env");
    }

    // Crear un wallet desde la clave privada
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    const deployer = new Deployer(hre, wallet);

    // Cargar el artefacto del contrato
    const artifact = await deployer.loadArtifact("TicketValidator");

    // Estimar el costo de despliegue
    const deploymentFee = await deployer.estimateDeployFee(artifact, []);

    console.log(`Costo estimado de despliegue: ${ethers.formatEther(deploymentFee)} ETH`);

    // Desplegar el contrato
    const ticketValidatorContract = await deployer.deploy(artifact, []);

    console.log("Esperando a que el contrato se despliegue...");
    await ticketValidatorContract.waitForDeployment();

    // Obtener la dirección del contrato desplegado
    const contractAddress = await ticketValidatorContract.getAddress();

    console.log(`Contrato TicketValidator desplegado en: ${contractAddress}`);

    // Verificar el contrato (opcional)
    console.log("Verificando contrato en el explorador...");
    await hre.run("verify:verify", {
        address: contractAddress,
        contract: "contracts/TicketValidator.sol:TicketValidator",
    }).catch(err => {
        console.log("Error en la verificación, puede verificarlo manualmente:", err.message);
    });

    return contractAddress;
}

main()
    .then((address) => {
        console.log("Dirección del contrato:", address);
        process.exitCode = 0;
    })
    .catch((error) => {
        console.error("Error en el despliegue:", error);
        process.exitCode = 1;
    });

// Ejecutar con: npx hardhat run deploy/TicketValidator.ts --network zkSyncSepolia