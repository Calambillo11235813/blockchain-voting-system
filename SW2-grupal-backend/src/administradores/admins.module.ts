import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminsController } from 'src/administradores/admins.controller';
import { AdminsService } from 'src/administradores/admins.service';
import { Administrador } from 'src/administradores/entities/administrador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Administrador])],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [AdminsService, TypeOrmModule],
})
export class AdminsModule {}
