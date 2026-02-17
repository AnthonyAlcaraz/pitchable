import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { readFile } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarpExporterService } from './marp-exporter.service.js';
import { RevealJsExporterService } from './revealjs-exporter.service.js';
import { PptxGenJsExporterService } from './pptxgenjs-exporter.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { ExportFormat, JobStatus } from '../../generated/prisma/enums.js';

/** Strip characters unsafe for Windows filenames and shell arg passing. */
function safeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*&;()!$^{}[\]`~#%+=']/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '-')
    .trim()
    .slice(0, 80);
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  private readonly tempDir = join(process.cwd(), 'exports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly marpExporter: MarpExporterService,
    private readonly revealJsExporter: RevealJsExporterService,
    private readonly pptxGenJsExporter: PptxGenJsExporterService,
    private readonly s3: S3Service,
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

      // Fetch image layout from PitchLens if linked
      let imageLayout: string | undefined;
      if (presentation.pitchLensId) {
        const lens = await this.prisma.pitchLens.findUnique({
          where: { id: presentation.pitchLensId },
          select: { imageLayout: true },
        });
        imageLayout = lens?.imageLayout ?? undefined;
      }

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      switch (job.format) {
        case ExportFormat.PPTX: {
          // Marp CLI produces proven Z4-quality PPTX output
          const pptxDir = join(this.tempDir, jobId);
          await mkdir(pptxDir, { recursive: true });
          const pptxPath = join(pptxDir, `${safeFilename(presentation.title)}.pptx`);
          const pptxMarkdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            slides,
            theme,
            imageLayout,
          );
          await this.marpExporter.exportToPptx(pptxMarkdown, pptxPath);
          buffer = await readFile(pptxPath);
          contentType =
            'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          filename = `${safeFilename(presentation.title)}.pptx`;
          break;
        }

        case ExportFormat.PDF: {
          // Marp CLI requires filesystem — write temp, read back
          const jobDir = join(this.tempDir, jobId);
          await mkdir(jobDir, { recursive: true });
          const outputPath = join(jobDir, `${safeFilename(presentation.title)}.pdf`);
          const markdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            slides,
            theme,
            imageLayout,
          );
          await this.marpExporter.exportToPdf(markdown, outputPath);
          buffer = await readFile(outputPath);
          contentType = 'application/pdf';
          filename = `${safeFilename(presentation.title)}.pdf`;
          break;
        }

        case ExportFormat.REVEAL_JS: {
          const html = this.revealJsExporter.generateRevealHtml(
            presentation,
            slides,
            theme,
          );
          buffer = Buffer.from(html, 'utf-8');
          contentType = 'text/html';
          filename = `${safeFilename(presentation.title)}.html`;
          break;
        }

        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      // Upload to S3 (non-blocking — export still succeeds if S3 is down)
      const s3Key = `exports/${jobId}/${filename}`;
      let fileUrl = s3Key;
      try {
        await this.s3.upload(s3Key, buffer, contentType);
      } catch (s3Err: unknown) {
        const s3Msg = s3Err instanceof Error ? s3Err.message : String(s3Err);
        this.logger.warn(`S3 upload skipped for job ${jobId}: ${s3Msg}`);
        fileUrl = `local://${s3Key}`;
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

  /**
   * Process an export and return the buffer directly (for email attachments).
   * Also uploads to S3 like processExport().
   */
  async processExportAndGetBuffer(jobId: string): Promise<Buffer> {
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

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: job.presentationId },
    });

    if (!presentation) {
      throw new Error(`Presentation "${job.presentationId}" not found`);
    }

    const slides = await this.prisma.slide.findMany({
      where: { presentationId: job.presentationId },
      orderBy: { slideNumber: 'asc' },
    });

    const theme = await this.prisma.theme.findUnique({
      where: { id: presentation.themeId },
    });

    if (!theme) {
      throw new Error(`Theme "${presentation.themeId}" not found`);
    }

    // Fetch image layout from PitchLens if linked
    let imageLayout: string | undefined;
    if (presentation.pitchLensId) {
      const lens = await this.prisma.pitchLens.findUnique({
        where: { id: presentation.pitchLensId },
        select: { imageLayout: true },
      });
      imageLayout = lens?.imageLayout ?? undefined;
    }

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (job.format) {
      case ExportFormat.PPTX: {
        const pptxDir = join(this.tempDir, jobId);
        await mkdir(pptxDir, { recursive: true });
        const pptxPath = join(pptxDir, `${safeFilename(presentation.title)}.pptx`);
        const pptxMd = this.marpExporter.generateMarpMarkdown(presentation, slides, theme, imageLayout);
        await this.marpExporter.exportToPptx(pptxMd, pptxPath);
        buffer = await readFile(pptxPath);
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        filename = `${safeFilename(presentation.title)}.pptx`;
        break;
      }
      case ExportFormat.PDF: {
        const jobDir = join(this.tempDir, jobId);
        await mkdir(jobDir, { recursive: true });
        const outputPath = join(jobDir, `${safeFilename(presentation.title)}.pdf`);
        const markdown = this.marpExporter.generateMarpMarkdown(presentation, slides, theme, imageLayout);
        await this.marpExporter.exportToPdf(markdown, outputPath);
        buffer = await readFile(outputPath);
        contentType = 'application/pdf';
        filename = `${safeFilename(presentation.title)}.pdf`;
        break;
      }
      case ExportFormat.REVEAL_JS: {
        const html = this.revealJsExporter.generateRevealHtml(presentation, slides, theme);
        buffer = Buffer.from(html, 'utf-8');
        contentType = 'text/html';
        filename = `${safeFilename(presentation.title)}.html`;
        break;
      }
      default:
        throw new Error(`Unsupported export format: ${job.format}`);
    }

    // Upload to S3 (non-blocking — export still succeeds if S3 is down)
    const s3Key = `exports/${jobId}/${filename}`;
    let fileUrl = s3Key;
    try {
      await this.s3.upload(s3Key, buffer, contentType);
    } catch (s3Err: unknown) {
      const s3Msg = s3Err instanceof Error ? s3Err.message : String(s3Err);
      this.logger.warn(`S3 upload skipped for job ${jobId}: ${s3Msg}`);
      fileUrl = `local://${s3Key}`;
    }

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        fileUrl,
        completedAt: new Date(),
      },
    });

    return buffer;
  }

  async getSignedDownloadUrl(
    jobId: string,
  ): Promise<{ url: string; filename: string }> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
      include: { presentation: { select: { title: true } } },
    });

    if (!job) {
      throw new NotFoundException(`Export job "${jobId}" not found`);
    }

    if (job.status !== JobStatus.COMPLETED || !job.fileUrl) {
      throw new NotFoundException(
        `Export job "${jobId}" is not completed or has no file`,
      );
    }

    const url = await this.s3.getSignedDownloadUrl(job.fileUrl, 3600);

    const extensionMap: Record<string, string> = {
      [ExportFormat.PPTX]: 'pptx',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.REVEAL_JS]: 'html',
      [ExportFormat.GOOGLE_SLIDES]: 'json',
    };
    const ext = extensionMap[job.format] ?? 'bin';
    const title = job.presentation?.title ?? 'presentation';
    const filename = `${title}.${ext}`;

    return { url, filename };
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
