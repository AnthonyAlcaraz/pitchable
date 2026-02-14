import { Controller, Get, Param } from '@nestjs/common';
import { ThemesService } from './themes.service.js';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  async findAll() {
    return this.themesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }
}
