import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { FormDataRequest } from 'nestjs-form-data';
import { CreateUserDTO } from '../dto/create-user.dto';
import { TenantService } from '../services/tenant.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tenantService: TenantService,
  ) { }

  @Post('create')
  @FormDataRequest()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDTO: CreateUserDTO) {
    return await this.userService.createUser(createUserDTO);
  }


}
