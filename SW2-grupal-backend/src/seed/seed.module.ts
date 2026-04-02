import { Module } from '@nestjs/common';
import { SeedService } from './services/seed.service';
import { SeedController } from './controllers/seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from 'src/auth/entities/permission.entity';
import { Role } from 'src/auth/entities/role.entity';
import { AdminsModule } from 'src/admins/admins.module';
import { AdministradorInitService } from 'src/seed/services/administrador-init.service';

@Module({
  imports: [
    AdminsModule,
    TypeOrmModule.forFeature([
      Role,
      Permission
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService, AdministradorInitService],
})
export class SeedModule { }
