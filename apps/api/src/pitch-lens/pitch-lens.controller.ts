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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator.js';
import { PitchLensService } from './pitch-lens.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePitchLensDto } from './dto/create-pitch-lens.dto.js';
import { UpdatePitchLensDto } from './dto/update-pitch-lens.dto.js';
import { RecommendFrameworksDto } from './dto/recommend-frameworks.dto.js';
import { RecommendThemesDto } from './dto/recommend-themes.dto.js';

@Controller('pitch-lens')
export class PitchLensController {
  constructor(
    private readonly pitchLensService: PitchLensService,
    private readonly prisma: PrismaService,
  ) {}

  // TEMPORARY: diagnostic endpoint to check DB schema
  @Get('debug/columns')
  async debugColumns() {
    const cols = await this.prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PitchLens' ORDER BY ordinal_position`,
    );
    const tables = await this.prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('FigmaTemplate', 'FigmaTemplateMapping', 'BriefLens', 'DraftSlide', 'SlideSource') ORDER BY table_name`,
    );
    return { pitchLensColumns: cols, missingTables: tables };
  }

  // ── Marketplace Endpoints (browse is public) ──

  @Get('marketplace/browse')
  async browseMarketplace(
    @Query('sortBy') sortBy?: string,
    @Query('industry') industry?: string,
    @Query('audienceType') audienceType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.pitchLensService.browsePublic({
      sortBy: (sortBy as 'popular' | 'rated' | 'recent') ?? 'popular',
      industry,
      audienceType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('marketplace/:id/clone')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async cloneLens(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.cloneLens(id, user.userId);
  }

  @Post('marketplace/:id/rate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rateLens(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('score') score: number,
  ) {
    return this.pitchLensService.rateLens(id, user.userId, score);
  }

  // ── Authenticated Endpoints ──

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePitchLensDto,
  ) {
    return this.pitchLensService.create(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: RequestUser) {
    return this.pitchLensService.findAll(user.userId);
  }

  @Get('archetypes')
  @UseGuards(JwtAuthGuard)
  listArchetypes() {
    return this.pitchLensService.listArchetypes();
  }

  @Get('archetypes/:archetypeId')
  @UseGuards(JwtAuthGuard)
  getArchetype(@Param('archetypeId') archetypeId: string) {
    return this.pitchLensService.getArchetypeDetails(archetypeId);
  }

  @Get('archetypes/:archetypeId/defaults')
  @UseGuards(JwtAuthGuard)
  getArchetypeDefaults(@Param('archetypeId') archetypeId: string) {
    return this.pitchLensService.getArchetypeDefaults(archetypeId);
  }

  @Post('recommend-archetype')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  recommendArchetype(@Body() body: { audienceType: string; pitchGoal: string }) {
    return this.pitchLensService.recommendArchetypes(body.audienceType, body.pitchGoal);
  }

  @Get('frameworks')
  @UseGuards(JwtAuthGuard)
  listFrameworks() {
    return this.pitchLensService.listFrameworks();
  }

  @Get(':id/recommended-engine')
  @UseGuards(JwtAuthGuard)
  async getRecommendedEngine(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.getRecommendedEngine(id, user.userId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishLens(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.publishLens(id, user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.findOne(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePitchLensDto,
  ) {
    return this.pitchLensService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.delete(id, user.userId);
  }

  @Post(':id/set-default')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.setDefault(id, user.userId);
  }

  @Post('recommend')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  recommend(@Body() dto: RecommendFrameworksDto) {
    return this.pitchLensService.getRecommendations(dto);
  }

  @Post('recommend-theme')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  recommendTheme(@Body() dto: RecommendThemesDto) {
    return this.pitchLensService.getThemeRecommendations(dto);
  }
}
