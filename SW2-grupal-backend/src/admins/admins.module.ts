import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminsController } from 'src/admins/admins.controller';
import { AdminsService } from 'src/admins/admins.service';
import { Administrador } from 'src/admins/entities/administrador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Administrador])],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [AdminsService, TypeOrmModule],
})
export class AdminsModule {}
