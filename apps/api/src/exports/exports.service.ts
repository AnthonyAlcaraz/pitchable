import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarpExporterService } from './marp-exporter.service.js';
import { RevealJsExporterService } from './revealjs-exporter.service.js';
import { ExportFormat, JobStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  private readonly exportDir = join(process.cwd(), 'exports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly marpExporter: MarpExporterService,
    private readonly revealJsExporter: RevealJsExporterService,
  ) {}

  async createExportJob(
    presentationId: string,
    format: ExportFormat,
  ) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
    });

    if (!presentation) {
      throw new NotFoundException(
        `Presentation with id "${presentationId}" not found`,
      );
    }

    const validFormats: string[] = Object.values(ExportFormat);
    if (!validFormats.includes(format)) {
      throw new BadRequestException(
        `Invalid export format: "${format}". Valid formats: ${validFormats.join(', ')}`,
      );
    }

    return this.prisma.exportJob.create({
      data: {
        presentationId,
        format,
        status: JobStatus.QUEUED,
      },
    });
  }

  async processExport(jobId: string): Promise<void> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PROCESSING },
    });

    try {
      const presentation = await this.prisma.presentation.findUnique({
        where: { id: job.presentationId },
      });

      if (!presentation) {
        throw new Error(
          `Presentation "${job.presentationId}" not found during export`,
        );
      }

      const slides = await this.prisma.slide.findMany({
        where: { presentationId: job.presentationId },
        orderBy: { slideNumber: 'asc' },
      });

      const theme = await this.prisma.theme.findUnique({
        where: { id: presentation.themeId },
      });

      if (!theme) {
        throw new Error(
          `Theme "${presentation.themeId}" not found during export`,
        );
      }

      const jobDir = join(this.exportDir, jobId);
      await mkdir(jobDir, { recursive: true });

      let fileUrl: string;

      switch (job.format) {
        case ExportFormat.PPTX: {
          const outputPath = join(jobDir, `${presentation.title}.pptx`);
          const markdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            slides,
            theme,
          );
          fileUrl = await this.marpExporter.exportToPptx(markdown, outputPath);
          break;
        }

        case ExportFormat.PDF: {
          const outputPath = join(jobDir, `${presentation.title}.pdf`);
          const markdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            slides,
            theme,
          );
          fileUrl = await this.marpExporter.exportToPdf(markdown, outputPath);
          break;
        }

        case ExportFormat.REVEAL_JS: {
          const outputPath = join(jobDir, `${presentation.title}.html`);
          const html = this.revealJsExporter.generateRevealHtml(
            presentation,
            slides,
            theme,
          );
          await writeFile(outputPath, html, 'utf-8');
          fileUrl = outputPath;
          break;
        }

        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          fileUrl,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Export job ${jobId} completed: ${job.format} -> ${fileUrl}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });

      this.logger.error(`Export job ${jobId} failed: ${message}`);
      throw error;
    }
  }

  async getExportStatus(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    return job;
  }

  async getExportsByPresentation(presentationId: string) {
    return this.prisma.exportJob.findMany({
      where: { presentationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
