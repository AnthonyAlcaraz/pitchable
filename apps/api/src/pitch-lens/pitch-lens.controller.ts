import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CreatePitchLensDto } from './dto/create-pitch-lens.dto.js';
import { UpdatePitchLensDto } from './dto/update-pitch-lens.dto.js';
import { RecommendFrameworksDto } from './dto/recommend-frameworks.dto.js';

@Controller('pitch-lens')
@UseGuards(JwtAuthGuard)
export class PitchLensController {
  constructor(private readonly pitchLensService: PitchLensService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePitchLensDto,
  ) {
    return this.pitchLensService.create(user.userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.pitchLensService.findAll(user.userId);
  }

  @Get('frameworks')
  listFrameworks() {
    return this.pitchLensService.listFrameworks();
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.findOne(id, user.userId);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePitchLensDto,
  ) {
    return this.pitchLensService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.delete(id, user.userId);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pitchLensService.setDefault(id, user.userId);
  }

  @Post('recommend')
  @HttpCode(HttpStatus.OK)
  recommend(@Body() dto: RecommendFrameworksDto) {
    return this.pitchLensService.getRecommendations(dto);
  }
}
