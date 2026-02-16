import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator.js';
import { PitchBriefService } from './pitch-brief.service.js';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service.js';
import { CreatePitchBriefDto } from './dto/create-pitch-brief.dto.js';
import { UpdatePitchBriefDto } from './dto/update-pitch-brief.dto.js';

@Controller('pitch-briefs')
@UseGuards(JwtAuthGuard)
export class PitchBriefController {
  constructor(
    private readonly briefService: PitchBriefService,
    private readonly kbService: KnowledgeBaseService,
  ) {}

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePitchBriefDto,
  ) {
    return this.briefService.create(user.userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.briefService.findAll(user.userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.briefService.findOne(user.userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePitchBriefDto,
  ) {
    return this.briefService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.briefService.delete(user.userId, id);
  }

  // ─── Document Management ──────────────────────────────────────────────────

  @Post(':id/documents/upload')
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
          new FileTypeValidator({
            fileType:
              /(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel|csv|plain|markdown|text)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('title') title?: string,
  ) {
    // Create document via KB service (handles S3 upload + queuing)
    const document = await this.kbService.uploadFile(user.userId, file, title);
    // Link to brief and update status
    await this.briefService.addDocument(user.userId, id, document.id);
    return document;
  }

  @Post(':id/documents/text')
  @HttpCode(HttpStatus.CREATED)
  async addTextDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @Body('title') title?: string,
  ) {
    const document = await this.kbService.createTextSource(
      user.userId,
      content,
      title,
    );
    await this.briefService.addDocument(user.userId, id, document.id);
    return document;
  }

  @Post(':id/documents/url')
  @HttpCode(HttpStatus.CREATED)
  async addUrlDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('url') url: string,
    @Body('title') title?: string,
  ) {
    const document = await this.kbService.createUrlSource(
      user.userId,
      url,
      title,
    );
    await this.briefService.addDocument(user.userId, id, document.id);
    return document;
  }

  @Delete(':id/documents/:docId')
  @HttpCode(HttpStatus.OK)
  async removeDocument(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ) {
    return this.briefService.removeDocument(user.userId, id, docId);
  }

  // ─── Graph / Knowledge ────────────────────────────────────────────────────

  @Get(':id/graph')
  async getGraph(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('start_node') startNode?: string,
    @Query('depth') depth?: string,
    @Query('max_nodes') maxNodes?: string,
  ) {
    return this.briefService.getGraph(user.userId, id, {
      startNode,
      depth: depth ? parseInt(depth, 10) : undefined,
      maxNodes: maxNodes ? parseInt(maxNodes, 10) : undefined,
    });
  }

  @Get(':id/graph/stats')
  async getGraphStats(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.briefService.getGraphStats(user.userId, id);
  }

  @Get(':id/graph/entities')
  async getEntities(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.briefService.getEntities(user.userId, id, {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/search')
  @HttpCode(HttpStatus.OK)
  async search(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('query') query: string,
    @Body('limit') limit?: number,
  ) {
    return this.briefService.search(user.userId, id, query, limit);
  }

  // ─── Lens Linking ─────────────────────────────────────────────────────────

  @Post(':id/link-lens/:lensId')
  @HttpCode(HttpStatus.CREATED)
  async linkLens(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lensId', ParseUUIDPipe) lensId: string,
  ) {
    return this.briefService.linkLens(user.userId, id, lensId);
  }

  @Delete(':id/link-lens/:lensId')
  @HttpCode(HttpStatus.OK)
  async unlinkLens(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lensId', ParseUUIDPipe) lensId: string,
  ) {
    return this.briefService.unlinkLens(user.userId, id, lensId);
  }
}
