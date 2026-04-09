import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { handleError } from 'src/compartido/manejo-errores';
import { Repository } from 'typeorm';
import { Role } from 'src/auth/entities/role.entity';
import { Permission } from 'src/auth/entities/permission.entity';
import { permissionSeedData, roleSeedData } from '../data/role-permission.data';
import { ApiResponse } from 'src/compartido/respuesta';

@Injectable()
export class SeedService {

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,

  ) { }


  async seed(): Promise<ApiResponse<null>> {
    try {
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
