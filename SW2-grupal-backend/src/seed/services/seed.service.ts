import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { handleError } from 'src/common/helpers/function-helper';
import { Configuration } from 'src/tenant/entities/configuration.entity';
import { Subscription } from 'src/tenant/entities/subscription.entity';
import { Repository } from 'typeorm';
import { configurationSeedData, subscriptionSeedData } from '../data/subscription-configuration.data';
import { Role } from 'src/auth/entities/role.entity';
import { Permission } from 'src/auth/entities/permission.entity';
import { permissionSeedData, roleSeedData } from '../data/role-permission.data';
import { ApiResponse } from 'src/common/interfaces/response.interface';

@Injectable()
export class SeedService {

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,

    @InjectRepository(Configuration)
    private configurationRepository: Repository<Configuration>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,

  ) { }


  async seed(): Promise<ApiResponse<null>> {
    try {
      await this.seedSubscriptions();
      await this.seedConfigurations();
      await this.seedRoles();
      await this.seedPermissions();
      return {
        statusCode: HttpStatus.OK,
        message: 'Datos sembrados correctamente',
        data: null,
      }
    } catch (err) {
      throw handleError(err, {
        context: 'SeedService.seed',
        action: 'seed',
        entityName: 'Seed',
        additionalInfo: {
          message: 'Error al sembrar los datos',
        }
      });
    }
  }


  private async seedSubscriptions(): Promise<ApiResponse<Subscription[]>> {
    try {
      const count = await this.subscriptionRepository.count();

      if (count > 0) {
        throw new BadRequestException('Ya existen planes de suscripción. Omitiendo siembra.');
      }
      const subscriptionsToSave = subscriptionSeedData.map(data =>
        this.subscriptionRepository.create(data)
      );

      await this.subscriptionRepository.save(subscriptionsToSave);

      return {
        statusCode: HttpStatus.OK,
        message: `Se han creado correctamente los planes de suscripción.`,
        data: subscriptionsToSave,
      }
    } catch (err) {
      throw handleError(err, {
        context: 'SeedService.seedSubscriptions',
        action: 'seed',
        entityName: 'Subscription',
        additionalInfo: {
          message: 'Error al sembrar los planes de suscripción',
        }
      });
    }
  }


  private async seedConfigurations(): Promise<ApiResponse<Configuration[]>> {
    try {
      const count = await this.configurationRepository.count();
      if (count > 0) {
        throw new BadRequestException('Ya existen las configuraciones. Omitiendo siembra.');
      }
      const configurationsToSave = configurationSeedData.map(data =>
        this.configurationRepository.create(data)
      );
      await this.configurationRepository.save(configurationsToSave);
      return {
        statusCode: HttpStatus.OK,
        message: `Se han creado correctamente las configuraciones.`,
        data: configurationsToSave
      }
    } catch (err) {
      throw handleError(err, {
        context: 'SeedService.seedConfigurations',
        action: 'seed',
        entityName: 'Configuration',
        additionalInfo: {
          message: 'Error al sembrar las configuraciones',
        }
      });
    }
  }


  async seedRoles(): Promise<ApiResponse<Role[]>> {
    try {
      const count = await this.roleRepository.count();

      if (count > 0) {
        throw new BadRequestException('Ya existen roles en la base de datos.');
      }

      const rolesToSave = roleSeedData.map(data =>
        this.roleRepository.create(data)
      );

      await this.roleRepository.save(rolesToSave);
      return {
        statusCode: HttpStatus.OK,
        message: `Se han creado ${rolesToSave.length} roles correctamente`,
        data: rolesToSave,
      };
    } catch (error) {
      throw handleError(error, {
        context: 'SeedService.seedRoles',
        action: 'seed',
        entityName: 'Role',
        additionalInfo: {
          message: 'Error al sembrar los roles',
        }
      });
    }
  }


  async seedPermissions(): Promise<ApiResponse<Permission[]>> {
    try {
      const count = await this.permissionRepository.count();

      if (count > 0) {
        throw new BadRequestException('Ya existen permisos en la base de datos.');
      }

      const permissionsToSave = permissionSeedData.map(data =>
        this.permissionRepository.create(data)
      );

      await this.permissionRepository.save(permissionsToSave);

      return {
        statusCode: HttpStatus.OK,
        message: `Se han creado ${permissionsToSave.length} permisos correctamente`,
        data: permissionsToSave
      };
    } catch (error) {
      throw handleError(error, {
        context: 'SeedService.seedPermissions',
        action: 'seed',
        entityName: 'Permission',
        additionalInfo: {
          message: 'Error al sembrar los permisos',
        }
      });
    }
  }

}
