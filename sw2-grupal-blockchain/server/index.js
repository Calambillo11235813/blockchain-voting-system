const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

app.post('/deploy-tenant-contract', (req, res) => {
    exec('npx hardhat run deploy/Tenant.ts --network zkSyncSepolia', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ message: 'Error al desplegar el contrato de Tenant', error: error.message });
        }
        if (stderr) {
            return res.status(500).json({ message: 'Error al desplegar el contrato de Tenant', error: stderr });
        }

        console.log(stdout);
        const contractAddress = extractAddressFromOutput(stdout);
        if (!contractAddress) {
            return res.status(500).json({ message: 'No se pudo obtener la dirección del contrato de Tenant' });
        }

        res.json({
            "message": "Contrato de Tenant desplegado correctamente",
            "contractTenant": contractAddress
        });
    });
});

app.post('/deploy-election-contract', (req, res) => {
    exec('npx hardhat run deploy/Election.ts --network zkSyncSepolia', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ message: 'Error al desplegar el contrato', error: error.message });
        }
        if (stderr) {
            return res.status(500).json({ message: 'Error al desplegar el contrato', error: stderr });
        }

        const contractAddress = extractAddressFromOutput(stdout);
        if (!contractAddress) {
            return res.status(500).json({ message: 'No se pudo obtener la dirección del contrato' });
        }

        res.json({
            "message": "Contrato de Election desplegado correctamente",
            "contractElection": contractAddress
        });
    });
});

app.post('/deploy-ticket-validator-contract', (req, res) => {
    exec('npx hardhat run deploy/TicketValidator.ts --network zkSyncSepolia', (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                message: 'Error al desplegar el contrato de TicketValidator', 
                error: error.message 
            });
        }
        if (stderr) {
            console.log('Warning/Stderr:', stderr); // Algunos stderr pueden ser warnings, no errores fatales
        }

        console.log('Stdout:', stdout);
        const contractAddress = extractAddressFromOutput(stdout);
        if (!contractAddress) {
            return res.status(500).json({ 
                message: 'No se pudo obtener la dirección del contrato de TicketValidator',
                output: stdout 
            });
        }

        res.json({
            "message": "Contrato de TicketValidator desplegado correctamente",
            "contractTicketValidator": contractAddress
        });
    });
});

function extractAddressFromOutput(output) {
    const match = output.match(/(0x[a-fA-F0-9]{40})/);
    return match ? match[1] : null;
}

const PORT = 6969;
app.listen(PORT, () => {
    console.log(`Hardhat microservice running on port ${PORT}`);
});