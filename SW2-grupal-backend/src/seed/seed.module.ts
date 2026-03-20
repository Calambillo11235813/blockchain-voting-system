import { Module } from '@nestjs/common';
import { SeedService } from './services/seed.service';
import { SeedController } from './controllers/seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from 'src/tenant/entities/configuration.entity';
import { Subscription } from 'src/tenant/entities/subscription.entity';
import { Permission } from 'src/auth/entities/permission.entity';
import { Role } from 'src/auth/entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Configuration,
      Role,
      Permission
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule { }
