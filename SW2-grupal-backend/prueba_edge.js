// prueba_edge.js
const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');

(async function testEdge() {
    // Configurar las opciones de Edge
    const options = new edge.Options();
    // Descomenta la siguiente línea si quieres ver el navegador en modo headless (sin interfaz gráfica)
    // options.addArguments('--headless');

    // Crear el driver
    let driver = await new Builder()
        .forBrowser('MicrosoftEdge')
        .setEdgeOptions(options)
        .build();

    try {
        // Ir a Google (prueba simple)
        await driver.get('https://www.google.com');

        // Buscar un elemento (ej. el logo)
        const logo = await driver.findElement(By.css('img[alt="Google"]'));
        const isDisplayed = await logo.isDisplayed();
        console.log('✅ Prueba exitosa: Logo de Google visible:', isDisplayed);

        // Tomar captura de pantalla para evidencia
        const screenshot = await driver.takeScreenshot();
        require('fs').writeFileSync('evidencia_edge.png', screenshot, 'base64');
        console.log('📸 Captura guardada como evidencia_edge.png');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        // Cerrar el navegador
        await driver.quit();
    }
})();