import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindOptionsSelect, FindOptionsOrder } from 'typeorm';

import { CreateUserDTO } from '../dto/create-user.dto';
import { handleError } from 'src/common/helpers/function-helper';
import { IOptionUser } from '../interface/option-user.interface';
import { User } from 'src/auth/entities/user.entity';
import { GenderEnum } from '../enums/gender.enum';
import { hashSync } from 'bcryptjs';
import { ApiResponse } from 'src/common/interfaces/response.interface';
import { CreateUserResponse } from '../interface/user.interface';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async createUser(createUserDto: CreateUserDTO): Promise<ApiResponse<CreateUserResponse>> {
    const { email, fullname, lastname, phone, password, gender = GenderEnum.UNSPECIFIED, is_policy_accepted } = createUserDto;
    const saltOrRounds = 10;

    try {
      const existingUser = await this.findUser({
        where: [
          { email },
          { fullname },
          { lastname },
          { phone },
        ]
      });

      if (existingUser) {
        throw new BadRequestException("El usuario ya se encuentra en sistema");
      }

      const queryRunner = this.userRepository.manager.connection.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const user = this.userRepository.create({
          email,
          phone,
          fullname,
          lastname,
          password: hashSync(password, saltOrRounds),
          gender,
          is_policy_accepted: is_policy_accepted,
        });

        const savedUser = await queryRunner.manager.save(user);

        // Send confirmation email
        // await this.mailsService.sendUserConfirmation(savedUser.name, savedUser.email);
        await queryRunner.commitTransaction();

        return {
          statusCode: HttpStatus.CREATED,
          message: 'Usuario creado correctamente',
          data: {
            user: savedUser
          }
        }

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw handleError(err, {
        context: 'UserService.createUser',
        action: 'query',
        entityName: 'User',
        additionalInfo: {
          createUserDto,
          message: 'Error al crear el usuario',
        }
      });
    }
  }


  async findUser({
    where,
    select,
    order
  }: IOptionUser): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: where as FindOptionsWhere<User>,
        select: select as FindOptionsSelect<User>,
        order: order as FindOptionsOrder<User>
      });
    } catch (error) {
      throw handleError(error, {
        context: 'UserService.findUser',
        action: 'query',
        entityName: 'User',
        additionalInfo: {
          message: 'Error al buscar el usuario',
        }
      });
    }
  }


  async countUsers({
    where,
  }: IOptionUser): Promise<number> {
    try {
      return await this.userRepository.count({
        where: where as FindOptionsWhere<User>,
      });
    } catch (error) {
      throw handleError(error, {
        context: 'UserService.countUsers',
        action: 'query',
        entityName: 'User',
        additionalInfo: {
          message: 'Error al contar los usuarios',
        }
      });
    }
  }


  async findIdUser(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ id });
    } catch (error) {
      throw handleError(error, {
        context: 'UserService.findIdUser',
        action: 'query',
        entityName: 'User',
        additionalInfo: {
          message: 'Error al buscar el usuario por ID',
        }
      });
    }
  }


  async findAllUser({
    where,
    select,
    order,
    skip,
    take
  }: IOptionUser): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: where as FindOptionsWhere<User>,
        select: select as FindOptionsSelect<User>,
        order: order as FindOptionsOrder<User>,
        skip,
        take
      });
    } catch (error) {
      throw handleError(error, {
        context: 'UserService.findAllUser',
        action: 'query',
        entityName: 'User',
        additionalInfo: {
          message: 'Error al buscar todos los usuarios',
        }
      });
    }
  }

}