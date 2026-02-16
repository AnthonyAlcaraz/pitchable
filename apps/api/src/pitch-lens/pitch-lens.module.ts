import { Module } from '@nestjs/common';
import { PitchLensController } from './pitch-lens.controller.js';
import { PitchLensService } from './pitch-lens.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ThemesModule } from '../themes/themes.module.js';

@Module({
  imports: [PrismaModule, ThemesModule],
  controllers: [PitchLensController],
  providers: [PitchLensService],
  exports: [PitchLensService],
})
export class PitchLensModule {}
