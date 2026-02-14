import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThemesService } from './themes.service.js';

@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  @ApiOperation({ summary: 'List all themes' })
  @ApiResponse({ status: 200, description: 'Returns all available themes' })
  async findAll() {
    return this.themesService.findAll();
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate all themes against design constraints' })
  @ApiResponse({ status: 200, description: 'Validation results for each theme' })
  async validateAll() {
    return this.themesService.validateAllThemes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme by ID' })
  @ApiResponse({ status: 200, description: 'Returns the theme' })
  @ApiResponse({ status: 404, description: 'Theme not found' })
  async findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }
}
