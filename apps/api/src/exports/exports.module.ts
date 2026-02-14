import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service.js';
import { ExportsController } from './exports.controller.js';
import { MarpExporterService } from './marp-exporter.service.js';
import { RevealJsExporterService } from './revealjs-exporter.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ExportsController],
  providers: [MarpExporterService, RevealJsExporterService, ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
