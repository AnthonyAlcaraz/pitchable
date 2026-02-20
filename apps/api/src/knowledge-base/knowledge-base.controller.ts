import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import multer from 'multer';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { DocumentFileValidator } from '../common/validators/document-file.validator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { CreateTextSourceDto, CreateUrlSourceDto } from './dto/create-text-source.dto.js';
import { SearchKbDto } from './dto/search-kb.dto.js';

@ApiTags('knowledge-base')
@ApiBearerAuth()
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new DocumentFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.kbService.uploadFile(user.userId, file, dto.title);
  }

  @Post('text')
  async createTextSource(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTextSourceDto,
  ) {
    return this.kbService.createTextSource(user.userId, dto.content, dto.title);
  }

  @Post('url')
  async createUrlSource(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUrlSourceDto,
  ) {
    return this.kbService.createUrlSource(user.userId, dto.url, dto.title);
  }

  @Get('documents')
  async listDocuments(@CurrentUser() user: RequestUser) {
    return this.kbService.listDocuments(user.userId);
  }

  @Get('documents/:id')
  async getDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kbService.getDocument(user.userId, id);
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.OK)
  async deleteDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.kbService.deleteDocument(user.userId, id);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchKnowledgeBase(
    @CurrentUser() user: RequestUser,
    @Body() dto: SearchKbDto,
  ) {
    return this.kbService.search(
      user.userId,
      dto.query,
      dto.limit,
      dto.threshold,
    );
  }
}
