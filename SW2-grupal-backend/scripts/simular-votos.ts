import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VotoService } from '../src/elecciones/services/voto.service';
import { DataSource } from 'typeorm';
import { Eleccion } from '../src/elecciones/entities/eleccion.entity';
import { PadronElectoral } from '../src/elecciones/entities/padron-electoral.entity';
import { Candidato } from '../src/elecciones/entities/candidato.entity';
import { RegistroSufragio } from '../src/elecciones/entities/registro-sufragio.entity';

async function bootstrap() {
  console.log('Inicializando contexto de la aplicación...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dataSource = app.get(DataSource);
  const votoService = app.get(VotoService);
  
  const eleccionRepo = dataSource.getRepository(Eleccion);
  const padronRepo = dataSource.getRepository(PadronElectoral);
  const candidatoRepo = dataSource.getRepository(Candidato);
  const registroRepo = dataSource.getRepository(RegistroSufragio);

  // 1. Buscar la elección activa
  const eleccion = await eleccionRepo.findOne({ where: { estaActiva: true } });
  if (!eleccion) {
    console.error('❌ No hay ninguna elección activa.');
    await app.close();
    return;
  }
  console.log(`✅ Elección activa encontrada: ${eleccion.titulo} (ID: ${eleccion.id})`);

  // 2. Recuperar todos los candidatos válidos para la elección
  const candidatos = await candidatoRepo.find({
    relations: ['frente', 'frente.eleccionCargo', 'frente.eleccionCargo.eleccion'],
    where: { frente: { eleccionCargo: { eleccion: { id: eleccion.id } } } }
  });

  if (candidatos.length === 0) {
    console.error('❌ No se encontraron candidatos para la elección activa.');
    await app.close();
    return;
  }
  console.log(`✅ Se encontraron ${candidatos.length} candidatos en la elección.`);

  // 3. Recuperar el padrón habilitado que aún no ha votado
  // Obtener a los que ya votaron
  const yaVotaron = await registroRepo.find({
    where: { eleccion: { id: eleccion.id } },
    relations: ['elector']
  });
  const idsYaVotaron = yaVotaron.map(r => r.elector.id);

  // Obtener todos los habilitados
  let query = padronRepo.createQueryBuilder('padron')
    .innerJoinAndSelect('padron.elector', 'elector')
    .where('padron.eleccionId = :eleccionId', { eleccionId: eleccion.id })
    .andWhere('padron.estaHabilitado = true');
    
  if (idsYaVotaron.length > 0) {
    query = query.andWhere('elector.id NOT IN (:...idsYaVotaron)', { idsYaVotaron });
  }

  const electoresPendientes = await query.getMany();
  
  if (electoresPendientes.length === 0) {
    console.log('✅ Todos los electores habilitados ya han emitido su voto.');
    await app.close();
    return;
  }

  console.log(`🚀 Iniciando simulación de votos para ${electoresPendientes.length} electores...`);

  // 4. Bucle secuencial para emitir votos
  let exito = 0;
  let fallos = 0;

  for (let i = 0; i < electoresPendientes.length; i++) {
    const elector = electoresPendientes[i].elector;
    const candidatoRandom = candidatos[Math.floor(Math.random() * candidatos.length)];

    try {
      console.log(`\n[${i + 1}/${electoresPendientes.length}] Procesando voto para ${elector.nombre} ${elector.apellido}...`);
      
      const comprobante = await votoService.votar(elector.id, eleccion.id, candidatoRandom.id);
      
      console.log(`  └─ Votó por: ${candidatoRandom.nombres} ${candidatoRandom.apellidos}`);
      console.log(`  └─ ✅ Hash: ${comprobante.data.hashTransaccion}`);
      exito++;

      // Pequeña pausa para no saturar el nodo local de Hardhat y evitar colisiones de Nonce
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error(`  └─ ❌ Error al procesar voto: ${error.message}`);
      fallos++;
    }
  }

  console.log('\n======================================');
  console.log('🏁 SIMULACIÓN FINALIZADA');
  console.log(`Total Exitosos: ${exito}`);
  console.log(`Total Fallidos: ${fallos}`);
  console.log('======================================\n');

  await app.close();
}

bootstrap();
