const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_NETWORK = process.env.DEPLOY_NETWORK || 'sepolia';
const ALLOWED_NETWORKS = new Set(['sepolia', 'localhost']);

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/deploy-votacion', (req, res) => {
    const requestedNetwork = String(req.body?.network || DEFAULT_NETWORK).toLowerCase();
    if (!ALLOWED_NETWORKS.has(requestedNetwork)) {
        return res.status(400).json({
            message: 'Red no permitida. Usa sepolia o localhost.',
        });
    }

    const command = `npx hardhat ignition deploy ./ignition/modules/Votacion.ts --network ${requestedNetwork}`;
    exec(command, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ message: 'Error al desplegar el contrato', error: error.message });
        }

        if (stderr) {
            console.log('Warning/Stderr:', stderr);
        }

        const contractAddress = extractAddressFromOutput(stdout);
        if (!contractAddress) {
            return res.status(500).json({
                message: 'No se pudo obtener la direccion del contrato',
                output: stdout,
            });
        }

        return res.json({
            message: 'Contrato Votacion desplegado correctamente',
            network: requestedNetwork,
            contractAddress,
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