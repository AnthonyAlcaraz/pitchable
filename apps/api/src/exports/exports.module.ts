import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service.js';
import { ExportsController } from './exports.controller.js';
import { MarpExporterService } from './marp-exporter.service.js';
import { RevealJsExporterService } from './revealjs-exporter.service.js';
import { PptxGenJsExporterService } from './pptxgenjs-exporter.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { FigmaModule } from '../figma/figma.module.js';

@Module({
  imports: [PrismaModule, KnowledgeBaseModule, FigmaModule],
  controllers: [ExportsController],
  providers: [MarpExporterService, RevealJsExporterService, PptxGenJsExporterService, ExportsService],
  exports: [ExportsService, MarpExporterService],
})
export class ExportsModule {}
