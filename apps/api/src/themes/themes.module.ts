import { Module } from '@nestjs/common';
import { ThemesService } from './themes.service.js';
import { ThemesController } from './themes.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ThemesController],
  providers: [ThemesService],
  exports: [ThemesService],
})
export class ThemesModule {}
