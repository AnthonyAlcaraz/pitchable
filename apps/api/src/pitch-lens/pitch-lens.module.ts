import { Module } from '@nestjs/common';
import { PitchLensController } from './pitch-lens.controller.js';
import { PitchLensService } from './pitch-lens.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PitchLensController],
  providers: [PitchLensService],
  exports: [PitchLensService],
})
export class PitchLensModule {}
