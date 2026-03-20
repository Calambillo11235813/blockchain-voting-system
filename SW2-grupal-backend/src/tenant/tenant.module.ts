import { Module, forwardRef } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { MemberTenant } from './entities/member-tenant.entity';
import { PaymentMembreship } from './entities/payment-membreship';
import { SubscriptionService } from './services/subscription.service';
import { AuthModule } from 'src/auth/auth.module';
import { SubscriptionController } from './controllers/subscription.controller';
import { UserModule } from 'src/user/user.module';
import { Configuration } from './entities/configuration.entity';
import { Role } from 'src/auth/entities/role.entity';
import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthTenantGuard } from 'src/auth/guards/auth-tenant.guard';
import { MemberTenantService } from './services/member-tenant.service';
import { BlockchainModule } from '../blockchain/blockchain.module';


@Module({
    controllers: [
        SubscriptionController,
        // TenantController
    ],
    providers: [
        TenantService,
        SubscriptionService,
        MemberTenantService,
        TenantMiddleware,
        TenantInterceptor,
        JwtStrategy,
        AuthTenantGuard
    ],
    imports: [
        AuthModule,
        UserModule,
        TypeOrmModule.forFeature([
            Tenant,
            Subscription,
            MemberTenant,
            PaymentMembreship,
            Configuration,
            Role
        ]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    secret: configService.get('secret_key_jwt'),
                    signOptions: {
                        expiresIn: '24h',
                    },
                };
            },
                }),
        forwardRef(() => BlockchainModule),
    ],
    exports: [
        TenantService,
        SubscriptionService,
        MemberTenantService,
        JwtModule,
        AuthTenantGuard
    ]
})
export class TenantModule { }
