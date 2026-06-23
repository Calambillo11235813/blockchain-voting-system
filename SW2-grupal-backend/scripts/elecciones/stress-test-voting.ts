import { Client } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
// Cargar variables de entorno desde el .env del backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}/api`;
const BATCH_SIZE = 50;
const TOTAL_ESTUDIANTES = 1000;
const TOTAL_DOCENTES = 50;

/**
 * Función auxiliar para retrasar la ejecución (evitar saturar la red o el backend local).
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runStressTest() {
  console.log('🔥 INICIANDO PRUEBA DE FUEGO (STRESS TEST) - 1050 ELECTORES 🔥');

  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    console.log(`✅ Conectado a la Base de Datos: ${process.env.DB_NAME}`);

    // 1. Obtener Elección Activa
    const resEleccion = await client.query(`SELECT id, titulo FROM eleccion WHERE "estaActiva" = true LIMIT 1`);
    if (resEleccion.rows.length === 0) {
      console.error('❌ No hay ninguna elección activa en la BD.');
      return;
    }
    const eleccionId = resEleccion.rows[0].id;
    const eleccionTitulo = resEleccion.rows[0].titulo;
    console.log(`📌 Elección activa encontrada: ${eleccionTitulo} (${eleccionId})`);

    // 2. Obtener 1000 estudiantes y 50 docentes habilitados del padrón que NO hayan votado
    console.log('⏳ Extrayendo electores del padrón (que aún no han sufragado)...');
    const queryElectores = `
      SELECT e.id, e.registro, e.ci, e.apellido, e.estamento
      FROM padron_electoral p
      JOIN electores e ON p."electorId" = e.id
      WHERE p."eleccionId" = $1 AND p."estaHabilitado" = true
        AND NOT EXISTS (
          SELECT 1 FROM registro_sufragio rs 
          WHERE rs."eleccionId" = p."eleccionId" AND rs."electorId" = p."electorId"
        )
    `;
    const resPadron = await client.query(queryElectores, [eleccionId]);
    
    const estudiantes = resPadron.rows.filter((r: any) => r.estamento === 'ESTUDIANTE').slice(0, TOTAL_ESTUDIANTES);
    const docentes = resPadron.rows.filter((r: any) => r.estamento === 'DOCENTE').slice(0, TOTAL_DOCENTES);
    
    const electores = [...estudiantes, ...docentes];
    console.log(`✅ Se seleccionaron ${estudiantes.length} estudiantes y ${docentes.length} docentes.`);
    console.log(`📊 Total a procesar: ${electores.length} electores.`);

    if (electores.length === 0) {
      console.log('⚠️ No hay electores suficientes para la prueba o ya votaron todos.');
      return;
    }

    const startTime = Date.now();
    let exitosos = 0;
    let fallidos = 0;

    // Procesar en lotes (Batches)
    const numBatches = Math.ceil(electores.length / BATCH_SIZE);

    for (let i = 0; i < numBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = startIdx + BATCH_SIZE;
      const lote = electores.slice(startIdx, endIdx);

      console.log(`\n🚀 Iniciando Lote ${i + 1}/${numBatches} (${lote.length} electores)`);

      const promesas = lote.map(async (elector) => {
        try {
          // Generar contraseña
          const initials = String(elector.apellido || '')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0)
            .map(word => word[0])
            .join('')
            .toUpperCase();
          const expectedPassword = `${initials}${String(elector.ci || '').trim()}`;

          // A. Login
          const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
            registro: elector.registro,
            password: expectedPassword,
            eleccionId: eleccionId
          });
          const token = loginRes.data?.data?.token;
          if (!token) throw new Error('No se recibió token JWT en el login');

          // B. Obtener Papeleta (para saber qué opciones hay disponibles para este elector)
          const papeletaRes = await axios.get(`${API_BASE_URL}/elecciones/${eleccionId}/papeleta`, {
            params: { registro: elector.registro },
            headers: { Authorization: `Bearer ${token}` }
          });
          const papeletaData = papeletaRes.data;
          
          if (!papeletaData || !papeletaData.cargos || papeletaData.cargos.length === 0) {
            throw new Error('Elector no tiene cargos/papeletas habilitadas');
          }

          // C. Seleccionar candidatos al azar para las papeletas
          const selecciones = papeletaData.cargos.map((cargo: any) => {
            // Reunimos todos los candidatos de todos los frentes
            const todosLosCandidatos = cargo.frentes.flatMap((f: any) => f.candidatos);
            if (todosLosCandidatos.length === 0) {
              return null; // Caso extremo, sin opciones
            }
            // Escoger uno al azar
            const randomCand = todosLosCandidatos[Math.floor(Math.random() * todosLosCandidatos.length)];
            return {
              eleccionCargoId: cargo.id, // O cargoId, depende de la estructura, pero cargo.id es eleccionCargoId según papeleta.service
              candidatoId: randomCand.id
            };
          }).filter(Boolean); // Remover nulos

          if (selecciones.length === 0) throw new Error('No se encontraron candidatos válidos para seleccionar');

          // D. Emitir Voto
          const votoRes = await axios.post(`${API_BASE_URL}/elecciones/candidato/votar-batch`, {
            eleccionId,
            selecciones
          }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 600000 // 10 minutos para soportar la cola del Mutex
          });

          return { success: true, registro: elector.registro, txHash: votoRes.data?.data?.hashTransaccion || 'OK' };
        } catch (error: any) {
          console.error('Full Error:', error.response?.data || error.message);
          const errMsg = error.response?.data?.message || error.response?.data || error.message || 'Error desconocido';
          return { success: false, registro: elector.registro, error: JSON.stringify(errMsg) };
        }
      });

      // Ejecutar las peticiones concurrentes del lote
      const resultados = await Promise.all(promesas);

      // Contar resultados y loguear
      let exitosLote = 0;
      let fallosLote = 0;
      for (const res of resultados) {
        if (res.success) {
          exitosLote++;
          exitosos++;
        } else {
          fallosLote++;
          fallidos++;
          if (fallosLote === 1 && i === 0) {
             console.error(`   ❌ Ejemplo de fallo (${res.registro}): ${res.error}`);
          }
        }
      }

      console.log(`✅ Lote ${i + 1} completado: ${exitosLote} exitosos, ${fallosLote} fallidos.`);
      
      // Pequeño descanso entre lotes para dejar respirar a Node/Postgres/Hardhat
      await delay(1000);
    }

    const endTime = Date.now();
    const durationSegundos = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n=============================================');
    console.log('🎉 PRUEBA DE FUEGO FINALIZADA');
    console.log(`⏱️  Tiempo total: ${durationSegundos} segundos`);
    console.log(`✅ Votos exitosos: ${exitosos}`);
    console.log(`❌ Votos fallidos: ${fallidos}`);
    console.log('=============================================');

  } catch (error) {
    console.error('❌ Error general durante la prueba:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar
runStressTest();
