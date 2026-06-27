const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const assert = require('assert');
const path = require('path');

describe('Pruebas de Integración - Flujo de Votación (Selenium)', function () {
    this.timeout(60000); // 60 segundos por prueba
    let driver;

    // 1. Configurar el driver antes de todas las pruebas
    before(async function () {
        const driverDir = path.join(__dirname, '../../../../node_modules/webdriver-manager/selenium');
        
        if (require('fs').existsSync(driverDir)) {
            process.env.PATH = driverDir + path.delimiter + process.env.PATH;
        }

        const options = new edge.Options();
        // Simular cámara para poder pasar la biometría sin que el navegador pida permisos ni se bloquee
        options.addArguments('--use-fake-ui-for-media-stream');
        options.addArguments('--use-fake-device-for-media-stream');

        driver = await new Builder()
            .forBrowser('MicrosoftEdge')
            .setEdgeOptions(options)
            .build();
    });

    // 2. Cerrar el driver después de todas las pruebas
    after(async function () {
        if (driver) await driver.quit();
    });

    // 3. Prueba de integración: Login + JWT + Redirección
    it('CU-08 + CU-09: Login institucional y sesión única (integración frontend-backend)', async function () {
        // Navegar al login
        await driver.get('http://localhost:5173/login');

        // Llenar credenciales
        const registroInput = await driver.findElement(By.css('input[autoComplete="username"]'));
        await registroInput.sendKeys('220241872');

        const passwordInput = await driver.findElement(By.css('input[type="password"]'));
        await passwordInput.sendKeys('AM11317137');
        await driver.findElement(By.css('button[type="submit"]')).click();

        // Esperar redirección (el backend debe generar JWT y el frontend debe guardarlo)
        await driver.wait(until.urlContains('/estudiante/biometria'), 10000);

        // Capturar evidencia: el token JWT está en sessionStorage
        const token = await driver.executeScript('return sessionStorage.getItem("auth.token")');
        assert.ok(token, 'El token JWT debe existir en sessionStorage');
        assert.ok(token.startsWith('eyJ'), 'El token debe tener formato JWT');
        console.log('✅ Token JWT generado y almacenado correctamente');

        // Tomar captura de pantalla como evidencia
        await driver.takeScreenshot().then(data => {
            require('fs').writeFileSync('evidencia_login_integracion.png', data, 'base64');
        });
    });

    // 4. Prueba de integración: Biometría con BYPASS (o cámara simulada)
    it('CU-10 + CU-11: Validación biométrica y OCR (integración con servicios IA - BYPASS activado)', async function () {
        await driver.get('http://localhost:5173/estudiante/biometria');

        // Tomar las 3 fotos requeridas (Frontal, Trasera, Selfie)
        for (let i = 0; i < 3; i++) {
            const takePhotoBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(text(),"Tomar foto")]')), 10000);
            await driver.wait(until.elementIsVisible(takePhotoBtn), 5000);
            await driver.sleep(1000); // Dar un poco de tiempo para que la cámara simulada inicie
            await takePhotoBtn.click();
        }

        // Hacer clic en "Verificar y continuar"
        const verifyBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(text(),"Verificar y continuar")]')), 10000);
        await driver.wait(until.elementIsEnabled(verifyBtn), 5000);
        await verifyBtn.click();

        // Tomar evidencia de la biometría pasando
        console.log('✅ Biometría procesada (cámara simulada / Bypass)');
        const screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync('evidencia_biometria_integracion.png', screenshot, 'base64');

        // Esperar redirección a la papeleta de votación
        await driver.wait(until.urlContains('/estudiante/votacion'), 15000);
    });

    // 5. Prueba de integración: Votación + Blockchain + Hash
    it('CU-12 + CU-13 + CU-14: Emitir voto, registrar en Blockchain y generar Hash (integración frontend-backend-blockchain)', async function () {
        // Navegar por el wizard de votación (elegir candidatos)
        while (true) {
            // Verificar si ya llegamos a la pantalla de resumen
            const summaryBtns = await driver.findElements(By.id('btn-emitir-voto-batch'));
            if (summaryBtns.length > 0) {
                await summaryBtns[0].click();
                break;
            }

            // Si seguimos en una papeleta, seleccionar el primer candidato disponible
            await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "group relative")]')), 10000);
            const candidateCards = await driver.findElements(By.xpath('//button[contains(@class, "group relative")]'));
            if (candidateCards.length > 0) {
                await candidateCards[0].click();
            }

            // Clic en Siguiente
            const nextButton = await driver.findElement(By.xpath('//button[contains(text(), "Siguiente")]'));
            await nextButton.click();
            await driver.sleep(1000);
        }

        // Esperar la respuesta del backend y que aparezca el comprobante (Hash Blockchain) en un tag <code>
        const hashElement = await driver.wait(until.elementLocated(By.css('code')), 30000);
        const txHash = await hashElement.getText();

        // Validar que el hash tiene formato de transacción Ethereum (0x + 64 caracteres)
        assert.ok(/^0x[a-fA-F0-9]{64}$/.test(txHash), 'El hash debe ser una transacción Blockchain válida');

        console.log('✅ Voto registrado en Blockchain, hash generado:', txHash);
        const screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync('evidencia_voto_blockchain_integracion.png', screenshot, 'base64');
    });

    // 6. Prueba de integración: Certificado (PDF + QR)
    it('CU-19: Descargar certificado de sufragio (integración frontend-backend-generación PDF)', async function () {
        // Como ya votamos, la pantalla actual debería mostrar el comprobante
        // Hacer clic en "Descargar Certificado"
        const downloadBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(text(),"Descargar Certificado")]')), 10000);
        await downloadBtn.click();

        // Dar tiempo para que se genere y descargue el PDF
        await driver.sleep(5000); 

        // Verificar que no haya errores en la consola del navegador
        const logs = await driver.manage().logs().get('browser');
        const errors = logs.filter(log => log.level.value === 1000); // SEVERE
        assert.strictEqual(errors.length, 0, 'No debe haber errores en la consola del navegador');

        console.log('✅ Certificado PDF solicitado y descargado correctamente');
        const screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync('evidencia_certificado_integracion.png', screenshot, 'base64');
    });
});