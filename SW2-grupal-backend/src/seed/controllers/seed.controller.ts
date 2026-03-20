import { Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { SeedService } from '../services/seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) { }

  @Post()
  @HttpCode(HttpStatus.OK)
  async executeSeed() {
    return await this.seedService.seed();
  }


}