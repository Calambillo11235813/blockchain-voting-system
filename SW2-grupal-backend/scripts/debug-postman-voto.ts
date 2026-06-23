import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

function calcularPassword(apellido: string, ci: string): string {
  const initials = String(apellido || '')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return `${initials}${String(ci || '').trim()}`;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const ds = app.get(DataSource);

  const eleccionRows = await ds.query(`
    SELECT id, titulo, estado, "estaActiva", fecha
    FROM eleccion
    WHERE "estaActiva" = true OR estado = 'ACTIVA'
    ORDER BY fecha DESC
    LIMIT 1
  `);

  const eleccion = eleccionRows[0];
  if (!eleccion) {
    console.log('No hay elección activa.');
    await app.close();
    return;
  }

  const eid = eleccion.id as string;

  const papeletas = await ds.query(
    `
    SELECT ec.id, ec.alcance, ec."codFacultad", ec."facultadNombre", ec."codCarrera", ec."carreraNombre", c.nombre AS cargo
    FROM eleccion_cargo ec
    JOIN cargo c ON c.id = ec."cargoId"
    WHERE ec."eleccionId" = $1
    ORDER BY ec.orden
  `,
    [eid],
  );

  const candidatos = await ds.query(
    `
    SELECT ca.id, ca.nombres, ca.apellidos, ca."rolEspecifico", ca."eleccionCargoId", f.sigla AS frente
    FROM candidato ca
    JOIN frente f ON f.id = ca."frenteId"
    WHERE ca."eleccionCargoId" IN (SELECT id FROM eleccion_cargo WHERE "eleccionId" = $1)
    ORDER BY ca."eleccionCargoId", f.sigla, ca."rolEspecifico"
  `,
    [eid],
  );

  const docentes = await ds.query(
    `
    SELECT e.id AS "electorId", e.registro, e."registroDocente", e.ci, e.nombre, e.apellido,
           e.estamento, e."codFacultad", e.carrera, p."habilitadoRector", p."estaHabilitado"
    FROM padron_electoral p
    JOIN electores e ON e.id = p."electorId"
    WHERE p."eleccionId" = $1
      AND p."estaHabilitado" = true
      AND e.estamento = 'DOCENTE'
      AND e."codFacultad" = '17'
      AND p."habilitadoRector" = true
      AND NOT EXISTS (
        SELECT 1 FROM registro_sufragio rs
        WHERE rs."electorId" = e.id AND rs."eleccionId" = p."eleccionId"
      )
    LIMIT 5
  `,
    [eid],
  );

  const estudiantesSistemas = await ds.query(
    `
    SELECT e.id AS "electorId", e.registro, e.ci, e.nombre, e.apellido,
           e."codFacultad", e."codCarrera", e.carrera, p."habilitadoRector"
    FROM padron_electoral p
    JOIN electores e ON e.id = p."electorId"
    JOIN eleccion_cargo ec ON ec."eleccionId" = p."eleccionId" AND ec."codCarrera" = e."codCarrera"
    WHERE p."eleccionId" = $1
      AND p."estaHabilitado" = true
      AND e.estamento = 'ESTUDIANTE'
      AND e."codFacultad" = '17'
      AND NOT EXISTS (
        SELECT 1 FROM registro_sufragio rs
        WHERE rs."electorId" = e.id AND rs."eleccionId" = p."eleccionId"
      )
    LIMIT 5
  `,
    [eid],
  );

  const papeletaRector = papeletas.find((p: any) => p.alcance === 'GLOBAL');
  const papeletaDecano = papeletas.find((p: any) => p.alcance === 'FACULTAD');
  const papeletaDirector = papeletas.find((p: any) => p.alcance === 'CARRERA');

  const pickCandidato = (papeletaId: string, preferRol?: string) => {
    const pool = candidatos.filter((c: any) => c.eleccionCargoId === papeletaId);
    if (preferRol) {
      const match = pool.find((c: any) =>
        String(c.rolEspecifico || '').toLowerCase().includes(preferRol.toLowerCase()),
      );
      if (match) return match;
    }
    return pool[0];
  };

  const docente = docentes[0];
  const estudiante = estudiantesSistemas[0];

  const batchDocente = docente && papeletaRector && papeletaDecano && papeletaDirector
    ? {
        login: {
          registro: docente.registroDocente || docente.registro,
          password: calcularPassword(docente.apellido, docente.ci),
          electorId: docente.electorId,
          nombre: `${docente.nombre} ${docente.apellido}`,
        },
        body: {
          eleccionId: eid,
          selecciones: [
            {
              eleccionCargoId: papeletaRector.id,
              candidatoId: pickCandidato(papeletaRector.id, 'Rector')?.id,
            },
            {
              eleccionCargoId: papeletaDecano.id,
              candidatoId: pickCandidato(papeletaDecano.id, 'Decano')?.id,
            },
            {
              eleccionCargoId: papeletaDirector.id,
              candidatoId: pickCandidato(papeletaDirector.id, 'Director')?.id,
            },
          ],
        },
      }
    : null;

  const batchEstudiante = estudiante && papeletaDecano && papeletaDirector
    ? {
        login: {
          registro: estudiante.registro,
          password: calcularPassword(estudiante.apellido, estudiante.ci),
          electorId: estudiante.electorId,
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
        },
        body: {
          eleccionId: eid,
          selecciones: [
            {
              eleccionCargoId: papeletaDecano.id,
              candidatoId: pickCandidato(papeletaDecano.id, 'Decano')?.id,
            },
            {
              eleccionCargoId: papeletaDirector.id,
              candidatoId: pickCandidato(papeletaDirector.id, 'Director')?.id,
            },
          ],
        },
      }
    : null;

  console.log(JSON.stringify({
    eleccion,
    papeletas,
    candidatos,
    docentesElegibles3Papeletas: docentes,
    estudiantesSistemasElegibles: estudiantesSistemas,
    postman: {
      docente3Papeletas: batchDocente,
      estudiante2Papeletas: batchEstudiante,
    },
  }, null, 2));

  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
