import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ConstraintsModule } from '../constraints/constraints.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ExportsModule } from '../exports/exports.module.js';
import { EmailModule } from '../email/email.module.js';
import { PresentationsService } from './presentations.service.js';
import { PresentationsController } from './presentations.controller.js';
import { ContentParserService } from './content-parser.service.js';
import { SlideStructurerService } from './slide-structurer.service.js';

@Module({
  imports: [PrismaModule, ConstraintsModule, CreditsModule, ExportsModule, EmailModule],
  controllers: [PresentationsController],
  providers: [PresentationsService, ContentParserService, SlideStructurerService],
  exports: [PresentationsService],
})
export class PresentationsModule {}
