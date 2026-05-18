import { Module } from '@nestjs/common';
import { SeedService } from './services/seed.service';
import { SeedController } from './controllers/seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminsModule } from 'src/administradores/admins.module';
import { AdministradorInitService } from 'src/seed/services/administrador-init.service';

@Module({
  imports: [
    AdminsModule,
  ],
  controllers: [SeedController],
  providers: [SeedService, AdministradorInitService],
})
export class SeedModule { }
