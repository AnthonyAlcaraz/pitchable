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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
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
import { DocumentFileValidator } from '../common/validators/document-file.validator.js';
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
          new DocumentFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('title') title?: string,
  ) {
    // Create document via KB service (handles S3 upload + queuing + credit charge)
    let document;
    try {
      document = await this.kbService.uploadFile(user.userId, file, title, id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      throw new UnprocessableEntityException(msg);
    }
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

  @Post(':id/documents/crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async crawlWebsite(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('url') url: string,
    @Body('maxPages') maxPages?: number,
    @Body('maxDepth') maxDepth?: number,
  ) {
    // Verify brief ownership
    await this.briefService.findOne(user.userId, id);

    if (!this.kbService.isFirecrawlAvailable()) {
      throw new UnprocessableEntityException('Website crawling is not available. FIRECRAWL_API_KEY not configured.');
    }

    return this.kbService.crawlWebsite(
      user.userId,
      id,
      url,
      maxPages ?? 20,
      maxDepth ?? 2,
    );
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
    @Query('depth') depth?: string,
    @Query('limit') limit?: string,
  ) {
    return this.briefService.getGraph(user.userId, id, {
      depth: depth ? parseInt(depth, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id/graph/neighbors/:nodeId')
  async getNodeNeighbors(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('nodeId') nodeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.briefService.getNodeNeighbors(user.userId, id, nodeId, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id/graph/node/:nodeId/details')
  async getNodeDetails(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.briefService.getNodeDetails(user.userId, id, nodeId);
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

  @Post(':id/graph/backfill')
  @HttpCode(HttpStatus.OK)
  async backfillGraph(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.briefService.backfillGraph(user.userId, id);
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
