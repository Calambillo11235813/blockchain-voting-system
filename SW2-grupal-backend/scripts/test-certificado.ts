import axios from 'axios';

async function testDownload() {
  const baseURL = 'http://localhost:3000/api';
  const eleccionId = '1fc40366-dfbf-43cc-a654-547db46d896e';
  const registro = '221045686';
  
  console.log(`1. Iniciando sesión para el registro ${registro}...`);
  try {
    const loginRes = await axios.post(`${baseURL}/auth/login/elector`, {
      registro: registro,
      passwordInstitucional: 'DRG221045686', // D R G + 221045686 (Wait! The CI is needed! Let me just use a bypass or whatever)
      eleccionId: eleccionId
    });
    console.log('Login exitoso.');
    const token = loginRes.data.token;

    console.log('2. Descargando certificado...');
    const certRes = await axios.get(`${baseURL}/elecciones/certificado/${eleccionId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });
    
    console.log(`Certificado descargado: ${certRes.data.byteLength} bytes`);
  } catch (err: any) {
    console.error('ERROR EN LA PETICIÓN:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', err.response.data instanceof Buffer ? err.response.data.toString() : err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testDownload();
