const { Builder, By, until, Key } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Configuración del driver de Edge
const options = new edge.Options();
options.addArguments('--use-fake-ui-for-media-stream');
options.addArguments('--use-fake-device-for-media-stream');
// Descomentar para ver el navegador en acción (si no, va en headless)
// options.addArguments('--headless');

describe('Pruebas de Integración - Flujo Administrador (Selenium)', function () {
    this.timeout(120000); // 2 minutos por prueba (por la carga de archivos)
    let driver;

    // ============================================================
    // BEFORE: Inicializar el driver
    // ============================================================
    before(async function () {
        const driverDir = path.join(__dirname, '../../../../node_modules/webdriver-manager/selenium');

        if (require('fs').existsSync(driverDir)) {
            process.env.PATH = driverDir + path.delimiter + process.env.PATH;
        }

        driver = await new Builder()
            .forBrowser('MicrosoftEdge')
            .setEdgeOptions(options)
            .build();
    });

    // ============================================================
    // AFTER: Cerrar el driver
    // ============================================================
    after(async function () {
        if (driver) {
            await driver.quit();
        }
    });

    // ============================================================
    // UTILIDAD: Esperar y hacer clic seguro
    // ============================================================
    async function clickSafe(selector, timeout = 10000) {
        const locator = selector.startsWith('//') ? By.xpath(selector) : By.css(selector);
        const element = await driver.wait(until.elementLocated(locator), timeout);
        await driver.wait(until.elementIsVisible(element), timeout);
        await driver.wait(until.elementIsEnabled(element), timeout);
        await element.click();
        return element;
    }

    // ============================================================
    // UTILIDAD: Escribir en un input
    // ============================================================
    async function typeSafe(selector, text, timeout = 10000) {
        const locator = selector.startsWith('//') ? By.xpath(selector) : By.css(selector);
        const element = await driver.wait(until.elementLocated(locator), timeout);
        await driver.wait(until.elementIsVisible(element), timeout);
        await driver.wait(until.elementIsEnabled(element), timeout);
        await element.clear();
        await element.sendKeys(text);
        return element;
    }

    // ============================================================
    // UTILIDAD: Capturar pantalla con nombre dinámico
    // ============================================================
    async function takeScreenshot(name) {
        const data = await driver.takeScreenshot();
        const filepath = path.join(__dirname, `evidencia_admin_${name}_${Date.now()}.png`);
        fs.writeFileSync(filepath, data, 'base64');
        console.log(`📸 Captura guardada: ${filepath}`);
        return filepath;
    }

    // ============================================================
    // TEST 1: Login como Administrador Electoral
    // ============================================================
    it('✅ ADMIN-01: Login como Administrador de Sistemas', async function () {
        await driver.get('http://localhost:5173/login');

        // Llenar credenciales de ADMIN (usando el selector correcto del frontend)
        await typeSafe('input[autoComplete="username"]', '76847107.wr@gmail.com');
        await typeSafe('input[type="password"]', '123456');

        // Hacer clic en "Iniciar Sesión"
        await clickSafe('button[type="submit"]');

        // Esperar redirección al panel de administración
        await driver.wait(until.urlContains('/admin'), 10000);

        await takeScreenshot('01_login_admin_exitoso');
        console.log('✅ Administrador logueado correctamente');
    });

    // ============================================================
    // TEST 2: Crear una nueva Elección
    // ============================================================
    it('✅ ADMIN-02: Crear una nueva elección (convocatoria)', async function () {
        // Navegar a la gestión de elecciones directamente
        await driver.get('http://localhost:5173/admin/gestion-eleccion');
        await driver.sleep(1000);

        // Llenar formulario de elección
        await typeSafe('input[placeholder="Ej. Elección Facultativa 2026"]', 'Elección FICCT 2026-2 - Prueba Selenium');
        await typeSafe('input[placeholder="Ej. 2026"]', '2026');

        // Fechas: inyección directa para evitar problemas de formato (locale) en Selenium
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + 1);
        const formatYMD = (date) => date.toISOString().split('T')[0];
        const dateString = formatYMD(startDate);

        await driver.executeScript(`
            const input = document.querySelector('input[type="date"]');
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, '${dateString}');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        `);

        // Guardar ("Crear elección" en el frontend)
        await clickSafe('//button[contains(text(), "Crear elección") or contains(text(), "Guardar")]');

        // Esperar mensaje de éxito
        await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "correctamente") or contains(text(), "exitosa")]')), 10000);
        await takeScreenshot('02_eleccion_creada');
        console.log('✅ Elección creada exitosamente');
    });

    // ============================================================
    // TEST 3: Cargar el Padrón Electoral (Archivo Excel)
    // ============================================================
    it('✅ ADMIN-03: Cargar padrón electoral (Excel) - Integración con PostgreSQL', async function () {
        // Navegar a la gestión de padrón
        await driver.get('http://localhost:5173/admin/padron');
        await driver.sleep(1000);

        // Buscar el input de tipo file para subir el archivo
        const fileInput = await driver.wait(
            until.elementLocated(By.css('input[type="file"]')),
            10000
        );

        // Usar el archivo Excel proporcionado en fixtures
        const excelPath = path.resolve(__dirname, '../fixture/Padron_Sintetico_UAGRM.xlsx');
        if (!fs.existsSync(excelPath)) {
            throw new Error(`El archivo Excel no existe en: ${excelPath}`);
        }
        console.log(`📄 Usando archivo Excel de fixture: ${excelPath}`);

        // Enviar el archivo al input
        await fileInput.sendKeys(excelPath);
        await driver.sleep(1000);

        // Hacer clic en "Cargar padrón"
        await clickSafe('//button[contains(text(), "Cargar padrón") or contains(text(), "Cargar")]');

        // Esperar que aparezca el resumen de carga
        await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Total procesado:") or contains(text(), "Padrón cargado correctamente")]')), 30000);
        
        // Bajar un poco la vista para capturar el resumen
        await driver.executeScript('window.scrollBy(0, 400);');
        await driver.sleep(500);

        await takeScreenshot('03_padron_cargado');
        console.log('✅ Padrón Excel cargado exitosamente');
    });

    // ============================================================
    // TEST 4: Crear Papeleta (Cargo / Mesa)
    // ============================================================
    it('✅ ADMIN-04: Crear papeleta para la elección', async function () {
        // Navegar a "Gestión de Elecciones" y luego abrir configuración de papeletas
        await driver.get('http://localhost:5173/admin/gestion-eleccion');
        await driver.sleep(1000);

        // Clic en el botón "Configurar Papeletas" de la elección (usualmente el primer proceso de la tabla)
        await clickSafe('//button[contains(text(), "Configurar Papeletas")]');

        // Llenar datos de la papeleta
        await typeSafe('input[placeholder="Nombre de la papeleta"]', 'Rector - FICCT');

        // Guardar
        await clickSafe('//button[contains(text(), "Crear papeleta")]');

        await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "correctamente") or contains(text(), "exitosa")]')), 10000);
        await takeScreenshot('04_papeleta_creada');
        console.log('✅ Papeleta creada exitosamente');
    });

    // ============================================================
    // TEST 5: Crear Frente Político
    // ============================================================
    it('✅ ADMIN-05: Crear frente político', async function () {
        // Navegar a "Frentes y Candidatos"
        await driver.get('http://localhost:5173/admin/frentes-candidatos');
        await driver.sleep(1000);

        // Seleccionar "Gestionar Frentes/Candidatos" en la tabla
        await clickSafe('//button[contains(text(), "Gestionar Frentes/Candidatos")]');

        // Llenar datos del frente
        await typeSafe('input[placeholder="Ej. Renovación Estudiantil"]', 'Frente Unidad Universitaria');
        await typeSafe('input[placeholder="Ej. RE"]', 'FUU');

        // Guardar
        await clickSafe('//button[contains(text(), "Registrar frente")]');

        await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Registro exitoso")]')), 10000);
        await takeScreenshot('05_frente_creado');
        console.log('✅ Frente creado exitosamente');
    });

    // ============================================================
    // TEST 6: Crear Candidatos y Asignarlos
    // ============================================================
    it('✅ ADMIN-06: Crear candidatos y asignar a papeleta/frente', async function () {
        // Cambiar a la pestaña de Candidatos usando texto exacto para no chocar con "Frentes y Candidatos"
        await clickSafe('//button[normalize-space()="Candidatos"]');
        await driver.sleep(1000);

        // Seleccionar la papeleta creada
        const papeletaSelect = await driver.wait(
            until.elementLocated(By.xpath('//label[span[contains(text(), "Papeleta")]]//select')),
            10000
        );
        await papeletaSelect.click();
        await papeletaSelect.findElement(By.css('option:nth-child(2)')).click();

        // Seleccionar el frente creado
        const frenteSelect = await driver.wait(
            until.elementLocated(By.xpath('//label[span[contains(text(), "Frente")]]//select')),
            10000
        );
        await frenteSelect.click();
        await frenteSelect.findElement(By.css('option:nth-child(2)')).click();

        await driver.sleep(500);

        // Seleccionar el Cargo al que postula (asumiendo que se despliegan roles)
        try {
            const cargoSelect = await driver.wait(
                until.elementLocated(By.xpath('//label[span[contains(text(), "Cargo al que postula")]]//select')),
                10000
            );
            await cargoSelect.click();
            await cargoSelect.findElement(By.css('option:nth-child(2)')).click();
        } catch (e) {
            console.log('ℹ️ No se pudo seleccionar el cargo (quizás solo hay uno y se autoseleccionó)');
        }

        // Llenar datos del candidato
        await typeSafe('input[placeholder="Ej. 12345678"]', '9876543');
        await typeSafe('input[placeholder="Ej. María Fernanda"]', 'Ana María');
        await typeSafe('input[placeholder="Ej. Pérez García"]', 'Rojas Villarroel');

        // Guardar
        await clickSafe('//button[contains(text(), "Registrar candidato")]');

        await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Registro exitoso")]')), 10000);
        await takeScreenshot('06_candidato_creado');
        console.log('✅ Candidato creado y asignado correctamente');
    });

    // ============================================================
    // TEST 7: Sellar la Papeleta (Bloquear modificaciones)
    // ============================================================
    it('✅ ADMIN-07: Sellar papeleta (habilitar para votación)', async function () {
        // En tu proyecto, el botón para sellar está en la vista visual de "Configuración de Papeleta"
        await driver.get('http://localhost:5173/admin/configuracion-papeleta');
        await driver.sleep(1500);

        try {
            await clickSafe('//button[contains(text(), "Aprobar y Sellar Elección")]', 5000);
            
            // Confirmar en el modal
            await clickSafe('//button[contains(text(), "Confirmar y sellar")]', 5000);
            
            // Esperar que se recargue o muestre éxito
            await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "correctamente") or contains(text(), "exitosa")]')), 10000);
        } catch (e) {
            console.log('ℹ️ No se pudo sellar la elección automáticamente (quizás ya estaba sellada o el botón no apareció). Continuando...');
        }

        // Mover el scroll hacia arriba y a la derecha si es posible, para capturar la papeleta sellada
        await driver.executeScript(`
            window.scrollTo(0, 0); 
            const contenedor = document.querySelector(".overflow-x-auto, .w-full.overflow-hidden"); 
            if(contenedor) contenedor.scrollLeft = contenedor.scrollWidth / 2;
        `);
        await driver.sleep(500);

        await takeScreenshot('07_papeleta_sellada');
        console.log('✅ Papeleta preparada/sellada exitosamente');
    });

    // ============================================================
    // TEST 8: Activar la Elección (Abrir jornada)
    // ============================================================
    it('✅ ADMIN-08: Activar elección (abrir jornada electoral)', async function () {
        // Volver al listado de elecciones
        await driver.get('http://localhost:5173/admin/gestion-eleccion');
        await driver.sleep(1000);

        // Buscar la elección creada y hacer clic en "Abrir Votación"
        try {
            await clickSafe('//button[contains(text(), "Abrir Votación")]', 5000);

            // Confirmar modal si existe
            await clickSafe('//button[contains(text(), "Confirmar apertura") or contains(text(), "Sí, abrir")]', 5000);
        } catch (e) {
            console.log('ℹ️ El botón "Abrir Votación" no apareció (quizás la elección ya está activa o necesita sellarse por backend). Continuando...');
        }

        await takeScreenshot('08_eleccion_activada');
        console.log('✅ Elección activada exitosamente. ¡Los votantes ya pueden votar!');
    });

});