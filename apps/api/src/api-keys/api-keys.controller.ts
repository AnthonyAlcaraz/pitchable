import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateApiKeyDto) {
    const result = await this.apiKeysService.create(
      user.userId,
      dto.name,
      dto.scopes,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
    return { id: result.id, key: result.plaintext, prefix: result.prefix };
  }

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.apiKeysService.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.apiKeysService.revoke(user.userId, id);
  }

  @Post(':id/rotate')
  async rotate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.apiKeysService.rotate(user.userId, id);
    return { id: result.id, key: result.plaintext, prefix: result.prefix };
  }
}
