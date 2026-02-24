import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { readFile, writeFile, unlink } from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service.js';
import { MarpExporterService } from './marp-exporter.service.js';
import { RevealJsExporterService } from './revealjs-exporter.service.js';
import { PptxGenJsExporterService } from './pptxgenjs-exporter.service.js';
import { TemplateSelectorService } from './template-selector.service.js';
import { S3Service } from '../knowledge-base/storage/s3.service.js';
import { FigmaRendererService } from '../figma/figma-renderer.service.js';
import { ThemesService } from '../themes/themes.service.js';
import { RendererChooserService } from './renderer-chooser.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { ExportFormat, JobStatus } from '../../generated/prisma/enums.js';
import { type ColorPalette } from './slide-visual-theme.js';
import { sampleImageLuminance } from '../constraints/index.js';
import type { LayoutProfile } from './marp-exporter.service.js';
import type { PresentationModel } from '../../generated/prisma/models/Presentation.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';
import type { ThemeModel } from '../../generated/prisma/models/Theme.js';

// ── Figma export payload types ────────────────────────────

type StructuredBodyBlock =
  | { type: 'bullets'; items: Array<{ text: string; bold?: boolean }> }
  | { type: 'numbered'; items: Array<{ text: string; bold?: boolean }> }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'metrics'; items: Array<{ label: string; value: string; change?: string }> }
  | { type: 'subheading'; text: string };

interface FigmaExportSlideV2 extends FigmaExportSlide {
  structuredBody: StructuredBodyBlock[];
  backgroundVariant: string;
}

interface FigmaExportPayloadV2 {
  version: 2;
  presentationId: string;
  title: string;
  slideCount: number;
  theme: {
    name: string;
    headingFont: string;
    bodyFont: string;
    colors: ColorPalette;
  };
  slides: FigmaExportSlideV2[];
  dimensions: { width: 1920; height: 1080 };
}

interface FigmaExportSlide {
  slideNumber: number;
  slideType: string;
  title: string;
  bodyLines: string[];
  imageUrl: string | null;
  speakerNotes: string | null;
  sectionLabel: string | null;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

interface FigmaExportPayload {
  version: 1;
  presentationId: string;
  title: string;
  slideCount: number;
  theme: {
    name: string;
    headingFont: string;
    bodyFont: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      surface: string;
    };
  };
  slides: FigmaExportSlide[];
  dimensions: { width: 1920; height: 1080 };
}

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
    private readonly templateSelector: TemplateSelectorService,
    private readonly s3: S3Service,
    private readonly figmaRenderer: FigmaRendererService,
    private readonly themesService: ThemesService,
    private readonly rendererChooser: RendererChooserService,
    private readonly events: EventsGateway,
  ) {}


  /** Emit export progress to the presentation room via WebSocket. */
  private emitProgress(presentationId: string, jobId: string, step: string, progress: number, message: string): void {
    this.events.emitExportProgress(presentationId, { presentationId, jobId, step, progress, message });
  }
  /**
   * Wait for any pending image generation jobs to complete before exporting.
   * Polls every 3s, up to 3 minutes. If images are still pending after timeout,
   * proceeds with export anyway (some slides just won't have images).
   */
  private async waitForPendingImages(presentationId: string): Promise<void> {
    const MAX_WAIT_MS = 180_000; // 3 minutes
    const POLL_INTERVAL_MS = 3_000;
    const start = Date.now();

    // Get slide IDs for this presentation
    const slides = await this.prisma.slide.findMany({
      where: { presentationId },
      select: { id: true },
    });
    const slideIds = slides.map((s) => s.id);

    if (slideIds.length === 0) return;

    while (Date.now() - start < MAX_WAIT_MS) {
      const pendingJobs = await this.prisma.imageJob.count({
        where: {
          slideId: { in: slideIds },
          status: { in: [JobStatus.QUEUED, JobStatus.PROCESSING] },
        },
      });

      if (pendingJobs === 0) {
        this.logger.log(`All image jobs complete for presentation ${presentationId}`);
        return;
      }

      this.logger.debug(`Waiting for ${pendingJobs} pending image job(s)...`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    // Count how many finished vs still pending
    const remaining = await this.prisma.imageJob.count({
      where: {
        slideId: { in: slideIds },
        status: { in: [JobStatus.QUEUED, JobStatus.PROCESSING] },
      },
    });
    this.logger.warn(
      `Image wait timeout (${MAX_WAIT_MS / 1000}s) — ${remaining} job(s) still pending, proceeding with export`,
    );
  }

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

    // -- Idempotency: check for existing active job --
    const existingActive = await this.prisma.exportJob.findFirst({
      where: {
        presentationId,
        format,
        status: { in: [JobStatus.QUEUED, JobStatus.PROCESSING] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingActive) {
      this.logger.log(`Returning existing ${format} export job ${existingActive.id} (status: ${existingActive.status})`);
      // Staleness check: if PROCESSING > 10min, create new
      const ageMs = Date.now() - existingActive.createdAt.getTime();
      if (existingActive.status === 'PROCESSING' && ageMs > 600_000) {
        this.logger.warn(`Stale export job ${existingActive.id} (${Math.round(ageMs / 1000)}s old), creating new`);
      } else {
        return existingActive;
      }
    }

    // -- Double-click protection: check recently completed --
    const recentCompleted = await this.prisma.exportJob.findFirst({
      where: {
        presentationId,
        format,
        status: JobStatus.COMPLETED,
        completedAt: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (recentCompleted) {
      this.logger.log(`Returning recently completed ${format} export job ${recentCompleted.id}`);
      return recentCompleted;
    }

    return this.prisma.exportJob.create({
      data: {
        presentationId,
        format,
        status: JobStatus.QUEUED,
      },
    });
  }

  async processExport(jobId: string, _renderEngine?: 'auto' | 'marp' | 'figma'): Promise<void> {
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

    this.emitProgress(job.presentationId, jobId, 'waiting_images', 10, 'Waiting for images...');

    try {
      const presentation = await this.prisma.presentation.findUnique({
        where: { id: job.presentationId },
      });

      if (!presentation) {
        throw new Error(
          `Presentation "${job.presentationId}" not found during export`,
        );
      }

      // Wait for pending image generation jobs before exporting
      await this.waitForPendingImages(job.presentationId);

      this.emitProgress(job.presentationId, jobId, 'loading', 25, 'Loading presentation data...');

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

      // Fetch PitchLens context for auto-selection
      let figmaTemplateId: string | null = null;
      let audienceType: string | null = null;
      let pitchGoal: string | null = null;
      let toneStyle: string | null = null;
      let deckArchetype: string | null = null;

      if (presentation.pitchLensId) {
        const lens = await this.prisma.pitchLens.findUnique({
          where: { id: presentation.pitchLensId },
          select: {
            figmaTemplateId: true,
            audienceType: true,
            pitchGoal: true,
            toneStyle: true,
            deckArchetype: true,
          },
        });
        figmaTemplateId = lens?.figmaTemplateId ?? null;
        audienceType = lens?.audienceType ?? null;
        pitchGoal = lens?.pitchGoal ?? null;
        toneStyle = lens?.toneStyle ?? null;
        deckArchetype = lens?.deckArchetype ?? null;
      }

      // Auto-select render engine and layout profile
      const themeMeta = this.themesService.getThemeMeta(theme.name);
      const selection = this.templateSelector.selectRenderEngine({
        format: job.format,
        themeName: theme.name,
        themeCategory: themeMeta?.category ?? 'dark',
        defaultLayoutProfile: themeMeta?.defaultLayoutProfile ?? 'startup',
        figmaTemplateId,
        audienceType,
        pitchGoal,
        toneStyle,
        deckArchetype,
      });

      const layoutProfile: LayoutProfile = selection.layoutProfile;

      this.logger.log(`Export ${jobId}: engine=marp, profile=${layoutProfile} (${selection.reason})`);

      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      // AI renderer chooser: analyze content and suggest template upgrades
      const rendererOverrides = await this.rendererChooser.chooseRenderers(slides);

      this.emitProgress(job.presentationId, jobId, 'preparing', 40, 'Preparing export...');

      // Fetch Figma backgrounds if template is linked
      let figmaBackgrounds: Map<number, string> | undefined;

      this.emitProgress(job.presentationId, jobId, 'rendering', 55, `Rendering ${job.format.toLowerCase()}...`);

      switch (job.format) {
        case ExportFormat.PPTX: {
          const pptxDir = join(this.tempDir, jobId);
          await mkdir(pptxDir, { recursive: true });

          let figmaContrastOverrides: Map<number, { isDark: boolean; textColor: string }> | undefined;
          if (figmaTemplateId && presentation.userId) {
            const buffers = await this.figmaRenderer.fetchSlideBackgrounds(
              presentation.id, presentation.userId, figmaTemplateId,
            );
            figmaBackgrounds = new Map();
            figmaContrastOverrides = new Map();
            for (const [slideNum, buf] of buffers) {
              const bgFilename = `figma-bg-${slideNum}.png`;
              await writeFile(join(pptxDir, bgFilename), buf);
              figmaBackgrounds.set(slideNum, bgFilename);
              try {
                const lum = await sampleImageLuminance(buf);
                figmaContrastOverrides.set(slideNum, { isDark: lum.isDark, textColor: lum.recommendedTextColor });
              } catch { /* non-critical */ }
            }
          }

          // Pre-download external images so Marp CLI can access them locally
          const localSlidesPptx = await this.downloadSlideImages(slides, pptxDir);

          const pptxPath = join(pptxDir, `${safeFilename(presentation.title)}.pptx`);
          const pptxMarkdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            localSlidesPptx,
            theme,
            layoutProfile,
            rendererOverrides,
            figmaBackgrounds,
            figmaContrastOverrides,
          );
          await this.marpExporter.exportToPptx(pptxMarkdown, pptxPath);
          await this.cleanupSlideImages(pptxDir);
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

          let figmaContrastOverrides: Map<number, { isDark: boolean; textColor: string }> | undefined;
          if (figmaTemplateId && presentation.userId) {
            const buffers = await this.figmaRenderer.fetchSlideBackgrounds(
              presentation.id, presentation.userId, figmaTemplateId,
            );
            figmaBackgrounds = new Map();
            figmaContrastOverrides = new Map();
            for (const [slideNum, buf] of buffers) {
              const bgFilename = `figma-bg-${slideNum}.png`;
              await writeFile(join(jobDir, bgFilename), buf);
              figmaBackgrounds.set(slideNum, bgFilename);
              try {
                const lum = await sampleImageLuminance(buf);
                figmaContrastOverrides.set(slideNum, { isDark: lum.isDark, textColor: lum.recommendedTextColor });
              } catch { /* non-critical */ }
            }
          }

          // Pre-download external images so Marp CLI can access them locally
          const localSlides = await this.downloadSlideImages(slides, jobDir);

          const outputPath = join(jobDir, `${safeFilename(presentation.title)}.pdf`);
          const markdown = this.marpExporter.generateMarpMarkdown(
            presentation,
            localSlides,
            theme,
            layoutProfile,
            rendererOverrides,
            figmaBackgrounds,
            figmaContrastOverrides,
          );
          await this.marpExporter.exportToPdf(markdown, outputPath);
          await this.cleanupSlideImages(jobDir);
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

        case ExportFormat.FIGMA: {
          const payload = this.prepareFigmaExportV2(presentation, slides, theme);
          buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
          contentType = 'application/json';
          filename = `${safeFilename(presentation.title)}.json`;
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

      // Generate and persist per-slide preview images (best-effort, non-blocking)
      this.generateSlidePreviewImages(presentation, slides, theme, layoutProfile, rendererOverrides, figmaBackgrounds)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Preview generation failed for ${presentation.id}: ${msg}`);
        });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';

      this.emitProgress(job.presentationId, jobId, 'error', -1, message);

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

    // Wait for pending image generation jobs before exporting
    await this.waitForPendingImages(job.presentationId);

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

    // Fetch PitchLens context
    let figmaTemplateId: string | null = null;
    let audienceType: string | null = null;
    let pitchGoal: string | null = null;
    let toneStyle: string | null = null;
    let deckArchetype: string | null = null;

    if (presentation.pitchLensId) {
      const lens = await this.prisma.pitchLens.findUnique({
        where: { id: presentation.pitchLensId },
        select: {
          figmaTemplateId: true,
          audienceType: true,
          pitchGoal: true,
          toneStyle: true,
          deckArchetype: true,
        },
      });
      figmaTemplateId = lens?.figmaTemplateId ?? null;
      audienceType = lens?.audienceType ?? null;
      pitchGoal = lens?.pitchGoal ?? null;
      toneStyle = lens?.toneStyle ?? null;
      deckArchetype = lens?.deckArchetype ?? null;
    }

    // Auto-select render engine
    const themeMeta = this.themesService.getThemeMeta(theme.name);
    const selection = this.templateSelector.selectRenderEngine({
      format: job.format,
      themeName: theme.name,
      themeCategory: themeMeta?.category ?? 'dark',
      defaultLayoutProfile: themeMeta?.defaultLayoutProfile ?? 'startup',
      figmaTemplateId,
      audienceType,
      pitchGoal,
      toneStyle,
      deckArchetype,
    });
    const layoutProfile: LayoutProfile = selection.layoutProfile;

    // AI renderer chooser: analyze content and suggest template upgrades
    const rendererOverrides = await this.rendererChooser.chooseRenderers(slides);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;
    let figmaBackgrounds: Map<number, string> | undefined;

    switch (job.format) {
      case ExportFormat.PPTX: {
        const pptxDir = join(this.tempDir, jobId);
        await mkdir(pptxDir, { recursive: true });

        let figmaContrastOverrides: Map<number, { isDark: boolean; textColor: string }> | undefined;
        if (figmaTemplateId && presentation.userId) {
          const buffers = await this.figmaRenderer.fetchSlideBackgrounds(
            presentation.id, presentation.userId, figmaTemplateId,
          );
          figmaBackgrounds = new Map();
          figmaContrastOverrides = new Map();
          for (const [slideNum, buf] of buffers) {
            const bgFilename = `figma-bg-${slideNum}.png`;
            await writeFile(join(pptxDir, bgFilename), buf);
            figmaBackgrounds.set(slideNum, bgFilename);
            try {
              const lum = await sampleImageLuminance(buf);
              figmaContrastOverrides.set(slideNum, { isDark: lum.isDark, textColor: lum.recommendedTextColor });
            } catch { /* non-critical */ }
          }
        }

        // Pre-download external images so Marp CLI can access them locally
        const localSlidesPptx2 = await this.downloadSlideImages(slides, pptxDir);

        const pptxPath = join(pptxDir, `${safeFilename(presentation.title)}.pptx`);
        const pptxMd = this.marpExporter.generateMarpMarkdown(presentation, localSlidesPptx2, theme, layoutProfile, rendererOverrides, figmaBackgrounds, figmaContrastOverrides);
        await this.marpExporter.exportToPptx(pptxMd, pptxPath);
        await this.cleanupSlideImages(pptxDir);
        buffer = await readFile(pptxPath);
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        filename = `${safeFilename(presentation.title)}.pptx`;
        break;
      }
      case ExportFormat.PDF: {
        const jobDir = join(this.tempDir, jobId);
        await mkdir(jobDir, { recursive: true });

        let figmaContrastOverrides: Map<number, { isDark: boolean; textColor: string }> | undefined;
        if (figmaTemplateId && presentation.userId) {
          const buffers = await this.figmaRenderer.fetchSlideBackgrounds(
            presentation.id, presentation.userId, figmaTemplateId,
          );
          figmaBackgrounds = new Map();
          figmaContrastOverrides = new Map();
          for (const [slideNum, buf] of buffers) {
            const bgFilename = `figma-bg-${slideNum}.png`;
            await writeFile(join(jobDir, bgFilename), buf);
            figmaBackgrounds.set(slideNum, bgFilename);
            try {
              const lum = await sampleImageLuminance(buf);
              figmaContrastOverrides.set(slideNum, { isDark: lum.isDark, textColor: lum.recommendedTextColor });
            } catch { /* non-critical */ }
          }
        }

        // Pre-download external images so Marp CLI can access them locally
        const localSlides2 = await this.downloadSlideImages(slides, jobDir);

        const outputPath = join(jobDir, `${safeFilename(presentation.title)}.pdf`);
        const markdown = this.marpExporter.generateMarpMarkdown(presentation, localSlides2, theme, layoutProfile, rendererOverrides, figmaBackgrounds, figmaContrastOverrides);
        await this.marpExporter.exportToPdf(markdown, outputPath);
        await this.cleanupSlideImages(jobDir);
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
      case ExportFormat.FIGMA: {
        const payload = this.prepareFigmaExportV2(presentation, slides, theme);
        buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
        contentType = 'application/json';
        filename = `${safeFilename(presentation.title)}.json`;
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

    const extensionMap: Record<string, string> = {
      [ExportFormat.PPTX]: 'pptx',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.REVEAL_JS]: 'html',
      [ExportFormat.GOOGLE_SLIDES]: 'json',
      [ExportFormat.FIGMA]: 'json',
    };
    const ext = extensionMap[job.format] ?? 'bin';
    const title = job.presentation?.title ?? 'presentation';
    const filename = `${title}.${ext}`;

    // When S3 is available, return a presigned URL
    if (this.s3.isAvailable() && !job.fileUrl.startsWith('local://')) {
      const url = await this.s3.getSignedDownloadUrl(job.fileUrl, 3600);
      return { url, filename };
    }

    // Fallback: serve via the local download endpoint
    const url = `/exports/${jobId}/download`;
    return { url, filename };
  }

  /**
   * Get the export file buffer for direct serving (used when S3 is unavailable).
   */
  async getExportBuffer(
    jobId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
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

    const extMap: Record<string, string> = {
      [ExportFormat.PPTX]: 'pptx',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.REVEAL_JS]: 'html',
      [ExportFormat.GOOGLE_SLIDES]: 'json',
      [ExportFormat.FIGMA]: 'json',
    };
    const ctMap: Record<string, string> = {
      [ExportFormat.PPTX]: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.REVEAL_JS]: 'text/html',
      [ExportFormat.GOOGLE_SLIDES]: 'application/json',
      [ExportFormat.FIGMA]: 'application/json',
    };

    const ext = extMap[job.format] ?? 'bin';
    const title = job.presentation?.title ?? 'presentation';
    const filename = `${title}.${ext}`;
    const contentType = ctMap[job.format] ?? 'application/octet-stream';

    // Read from local exports directory
    const s3Key = job.fileUrl.replace('local://', '');
    const localPath = join(this.tempDir, '..', s3Key);
    try {
      const buffer = await readFile(localPath);
      return { buffer, filename, contentType };
    } catch {
      const altPath = join(this.tempDir, jobId, `${safeFilename(title)}.${ext}`);
      try {
        const buffer = await readFile(altPath);
        return { buffer, filename, contentType };
      } catch {
        throw new NotFoundException(
          `Export file not found locally for job "${jobId}". S3 is not configured.`,
        );
      }
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


  /**
   * Download external slide images (e.g. R2 URLs) to local temp files.
   * Returns modified slide copies with imageUrl replaced by local file paths.
   * This ensures Marp CLI's Chromium can access the images during rendering.
   */
  private async downloadOneImage(
    slide: SlideModel,
    tempDir: string,
  ): Promise<SlideModel> {
    if (!slide.imageUrl || !slide.imageUrl.startsWith('http')) {
      return slide;
    }

    try {
      const ext = slide.imageUrl.match(/\.(png|jpg|jpeg|webp|gif)/i)?.[1] ?? 'png';
      const localFilename = `slide-img-${slide.slideNumber}.${ext}`;
      const localPath = join(tempDir, localFilename);

      let imageBuffer: Buffer | null = null;

      // Try S3 client download first (for R2 URLs that aren't publicly accessible)
      const bucketMarker = '/pitchable-documents/';
      const bucketIdx = slide.imageUrl.indexOf(bucketMarker);
      if (bucketIdx !== -1) {
        const key = slide.imageUrl.slice(bucketIdx + bucketMarker.length);
        try {
          imageBuffer = await this.s3.getBuffer(key);
          this.logger.debug(`Downloaded image via S3 for slide ${slide.slideNumber}`);
        } catch (s3Err: unknown) {
          const s3Msg = s3Err instanceof Error ? s3Err.message : String(s3Err);
          this.logger.warn(`S3 download failed for slide ${slide.slideNumber}: ${s3Msg}, trying fetch...`);
        }
      }

      // Fallback to direct fetch (for non-R2 URLs like imgur)
      if (!imageBuffer) {
        const response = await fetch(slide.imageUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) {
          this.logger.warn(`Failed to download image for slide ${slide.slideNumber}: HTTP ${response.status}`);
          return slide;
        }
        const arrayBuf = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
      }

      await writeFile(localPath, imageBuffer);

      this.logger.debug(`Saved image for slide ${slide.slideNumber} -> ${localFilename}`);
      return {
        ...slide,
        imageUrl: localPath.replace(/\\/g, '/'),
      } as SlideModel;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Image download failed for slide ${slide.slideNumber}: ${msg}`);
      return slide;
    }
  }

  private async downloadSlideImages(
    slides: SlideModel[],
    tempDir: string,
  ): Promise<SlideModel[]> {
    const CONCURRENCY = 5;
    const results: SlideModel[] = [];

    for (let i = 0; i < slides.length; i += CONCURRENCY) {
      const batch = slides.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((slide) => this.downloadOneImage(slide, tempDir)),
      );
      for (let j = 0; j < settled.length; j++) {
        const result = settled[j];
        results.push(result.status === 'fulfilled' ? result.value : batch[j]);
      }
    }

    return results;
  }

  /**
   * Clean up downloaded slide images from temp directory.
   */
  private async cleanupSlideImages(tempDir: string): Promise<void> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(tempDir);
      for (const f of files) {
        if (f.startsWith('slide-img-')) {
          try { await unlink(join(tempDir, f)); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  /**
   * Build a structured JSON payload for Figma plugin import.
   * Contains all presentation data needed to reconstruct slides in Figma.
   */
  private prepareFigmaExport(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): FigmaExportPayload {
    const palette = theme.colorPalette as unknown as ColorPalette;

    const ACCENT_BG_TYPES = new Set(['TITLE', 'CTA']);

    const figmaSlides: FigmaExportSlide[] = slides.map((slide) => {
      const useAccentBg = ACCENT_BG_TYPES.has(slide.slideType);
      const backgroundColor = useAccentBg ? palette.primary : palette.background;
      const textColor = useAccentBg ? '#ffffff' : palette.text;
      const accentColor = palette.accent;

      const bodyLines = slide.body
        ? slide.body
            .split('\n')
            .map((line) => line.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean)
        : [];

      return {
        slideNumber: slide.slideNumber,
        slideType: slide.slideType,
        title: slide.title,
        bodyLines,
        imageUrl: slide.imageUrl ?? null,
        speakerNotes: slide.speakerNotes ?? null,
        sectionLabel: slide.sectionLabel ?? null,
        backgroundColor,
        textColor,
        accentColor,
      };
    });

    return {
      version: 1,
      presentationId: presentation.id,
      title: presentation.title,
      slideCount: slides.length,
      theme: {
        name: theme.name,
        headingFont: theme.headingFont,
        bodyFont: theme.bodyFont,
        colors: {
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
          background: palette.background,
          text: palette.text,
          surface: palette.surface,
        },
      },
      slides: figmaSlides,
      dimensions: { width: 1920, height: 1080 },
    };
  }

  /**
   * Build a V2 structured JSON payload for the enhanced Figma plugin.
   * Includes full 10-color palette and structured body blocks.
   */
  private prepareFigmaExportV2(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel,
  ): FigmaExportPayloadV2 {
    const palette = theme.colorPalette as unknown as ColorPalette;

    const figmaSlides: FigmaExportSlideV2[] = slides.map((slide) => {
      const backgroundColor = palette.background;
      const textColor = palette.text;
      const accentColor = palette.accent;

      const bodyLines = slide.body
        ? slide.body
            .split('\n')
            .map((line) => line.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean)
        : [];

      const structuredBody = this.parseBodyToBlocks(slide.body ?? '');

      return {
        slideNumber: slide.slideNumber,
        slideType: slide.slideType,
        title: slide.title,
        bodyLines,
        imageUrl: slide.imageUrl ?? null,
        speakerNotes: slide.speakerNotes ?? null,
        sectionLabel: slide.sectionLabel ?? null,
        backgroundColor,
        textColor,
        accentColor,
        structuredBody,
        backgroundVariant: 'default',
      };
    });

    return {
      version: 2,
      presentationId: presentation.id,
      title: presentation.title,
      slideCount: slides.length,
      theme: {
        name: theme.name,
        headingFont: theme.headingFont,
        bodyFont: theme.bodyFont,
        colors: {
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
          background: palette.background,
          text: palette.text,
          surface: palette.surface,
          border: palette.border,
          success: palette.success,
          warning: palette.warning,
          error: palette.error,
        },
      },
      slides: figmaSlides,
      dimensions: { width: 1920, height: 1080 },
    };
  }

  /**
   * Parse markdown-style slide body into structured blocks.
   */
  private parseBodyToBlocks(body: string): StructuredBodyBlock[] {
    if (!body.trim()) return [];

    const blocks: StructuredBodyBlock[] = [];
    const lines = body.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Subheading: ### or ## prefix
      if (/^#{2,3}\s+/.test(line)) {
        blocks.push({ type: 'subheading', text: line.replace(/^#{2,3}\s+/, '').trim() });
        i++;
        continue;
      }

      // Table: | header | header |
      if (line.trim().startsWith('|') && line.includes('|', 1)) {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Parse header row
        const headerCells = line.split('|').map((c) => c.trim()).filter(Boolean);
        headers.push(...headerCells);
        i++;

        // Skip separator row (|---|---|)
        if (i < lines.length && /^\|[\s-|]+\|$/.test(lines[i].trim())) {
          i++;
        }

        // Parse data rows
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const cells = lines[i].split('|').map((c) => c.trim()).filter(Boolean);
          rows.push(cells);
          i++;
        }

        blocks.push({ type: 'table', headers, rows });
        continue;
      }

      // Numbered list: 1. item
      if (/^\d+\.\s+/.test(line)) {
        const items: Array<{ text: string; bold?: boolean }> = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          const text = lines[i].replace(/^\d+\.\s+/, '').trim();
          const bold = text.startsWith('**') && text.endsWith('**');
          items.push({
            text: bold ? text.slice(2, -2) : text,
            bold: bold || undefined,
          });
          i++;
        }
        blocks.push({ type: 'numbered', items });
        continue;
      }

      // Bullet list: - item or * item
      if (/^[-*]\s+/.test(line)) {
        const items: Array<{ text: string; bold?: boolean }> = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
          const text = lines[i].replace(/^[-*]\s+/, '').trim();
          const bold = text.startsWith('**') && text.endsWith('**');
          items.push({
            text: bold ? text.slice(2, -2) : text,
            bold: bold || undefined,
          });
          i++;
        }
        blocks.push({ type: 'bullets', items });
        continue;
      }

      // Metrics: **value** label pattern (e.g., "**$1.2B** Revenue")
      if (/^\*\*[^*]+\*\*\s+/.test(line)) {
        const items: Array<{ label: string; value: string; change?: string }> = [];
        while (i < lines.length && /^\*\*[^*]+\*\*\s+/.test(lines[i])) {
          const match = lines[i].match(/^\*\*([^*]+)\*\*\s+(.+)$/);
          if (match) {
            items.push({ value: match[1], label: match[2] });
          }
          i++;
        }
        if (items.length > 0) {
          blocks.push({ type: 'metrics', items });
        }
        continue;
      }

      // Empty line — skip
      if (!line.trim()) {
        i++;
        continue;
      }

      // Default: paragraph
      blocks.push({ type: 'paragraph', text: line.trim() });
      i++;
    }

    return blocks;
  }

  /**
   * Get a slide's preview image — returns S3 URL redirect or local buffer.
   */
  async getSlidePreviewImage(
    slideId: string,
  ): Promise<{ url: string } | { buffer: Buffer } | null> {
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      select: { previewUrl: true },
    });

    if (!slide?.previewUrl) return null;

    if (!slide.previewUrl.startsWith('local://')) {
      // S3 key — get presigned URL
      try {
        const url = await this.s3.getSignedDownloadUrl(slide.previewUrl, 3600);
        return { url };
      } catch {
        return null;
      }
    }

    // Local file
    const s3Key = slide.previewUrl.replace('local://', '');
    const localPath = join(this.tempDir, '..', s3Key);
    try {
      const buffer = await readFile(localPath);
      return { buffer };
    } catch {
      return null;
    }
  }

  /**
   * Generate per-slide preview images and save them.
   * Uses the same Marp markdown the export uses.
   * Updates each slide's previewUrl in the database.
   */
  /**
   * Generate preview images for all slides in a presentation.
   * Can be called standalone (after deck generation) or as part of export.
   */
  async generatePreviewsForPresentation(presentationId: string): Promise<void> {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { theme: true },
    });
    if (!presentation || !presentation.theme) return;

    const slides = await this.prisma.slide.findMany({
      where: { presentationId },
      orderBy: { slideNumber: 'asc' },
    });
    if (slides.length === 0) return;

    const theme = presentation.theme as unknown as ThemeModel;

    // Load PitchLens context (same as export pipeline)
    let audienceType: string | null = null;
    let pitchGoal: string | null = null;
    let toneStyle: string | null = null;
    let deckArchetype: string | null = null;

    if (presentation.pitchLensId) {
      const lens = await this.prisma.pitchLens.findUnique({
        where: { id: presentation.pitchLensId },
        select: { audienceType: true, pitchGoal: true, toneStyle: true, deckArchetype: true },
      });
      audienceType = lens?.audienceType ?? null;
      pitchGoal = lens?.pitchGoal ?? null;
      toneStyle = lens?.toneStyle ?? null;
      deckArchetype = lens?.deckArchetype ?? null;
    }

    // Match the export pipeline: use theme-aware layout profile + AI renderer chooser
    const themeMeta = this.themesService.getThemeMeta(theme.name);
    const selection = this.templateSelector.selectRenderEngine({
      format: ExportFormat.PDF,
      themeName: theme.name,
      themeCategory: themeMeta?.category ?? 'dark',
      defaultLayoutProfile: themeMeta?.defaultLayoutProfile ?? 'startup',
      figmaTemplateId: null,
      audienceType,
      pitchGoal,
      toneStyle,
      deckArchetype,
    });

    const layoutProfile = selection.layoutProfile;
    const rendererOverrides = new Map<number, string>();

    await this.generateSlidePreviewImages(
      presentation as unknown as PresentationModel,
      slides as unknown as SlideModel[],
      theme,
      layoutProfile,
      rendererOverrides,
    );
  }

  /**
   * Upload preview buffers to S3 (parallel), batch DB update, then emit WebSocket events.
   */
  private async uploadAndEmitPreviews(
    presentation: PresentationModel,
    sortedSlides: SlideModel[],
    buffers: Buffer[],
  ): Promise<void> {
    const count = Math.min(buffers.length, sortedSlides.length);
    if (count === 0) return;

    // Phase 1: Parallel S3 uploads
    const uploadResults = await Promise.allSettled(
      Array.from({ length: count }, (_, i) => {
        const slide = sortedSlides[i];
        const s3Key = `previews/${presentation.id}/${slide.slideNumber}.jpeg`;
        return this.s3.upload(s3Key, buffers[i], 'image/jpeg').then(() => s3Key);
      }),
    );

    // Resolve preview URLs (S3 key or local fallback)
    const previewUrls: string[] = [];
    for (let i = 0; i < count; i++) {
      const result = uploadResults[i];
      if (result.status === 'fulfilled') {
        previewUrls.push(result.value);
      } else {
        // Fallback: save locally
        const slide = sortedSlides[i];
        const localDir = join(this.tempDir, '..', 'previews', presentation.id);
        await mkdir(localDir, { recursive: true });
        await writeFile(join(localDir, `${slide.slideNumber}.jpeg`), buffers[i]);
        previewUrls.push(`local://previews/${presentation.id}/${slide.slideNumber}.jpeg`);
      }
    }

    // Phase 2: Batch DB update in a single transaction
    await this.prisma.$transaction(
      Array.from({ length: count }, (_, i) =>
        this.prisma.slide.update({
          where: { id: sortedSlides[i].id },
          data: { previewUrl: previewUrls[i] },
        }),
      ),
    );

    // Phase 3: Emit all WebSocket events
    for (let i = 0; i < count; i++) {
      this.events.emitSlideUpdated({
        presentationId: presentation.id,
        slideId: sortedSlides[i].id,
        data: { previewUrl: previewUrls[i] },
      });
    }

    this.logger.log(`Saved ${count} slide previews for presentation ${presentation.id}`);
  }

  private async generateSlidePreviewImages(
    presentation: PresentationModel,
    slides: SlideModel[],
    theme: ThemeModel | null,
    layoutProfile?: LayoutProfile,
    rendererOverrides?: Map<number, string>,
    figmaBackgrounds?: Map<number, string>,
  ): Promise<void> {
    if (!theme) return;

    const sortedSlides = [...slides].sort((a, b) => a.slideNumber - b.slideNumber);

    // Start image downloads in parallel with Phase A rendering (overlap I/O)
    const hasImages = slides.some((s) => s.imageUrl?.startsWith('http'));
    let downloadPromise: Promise<SlideModel[] | null> = Promise.resolve(null);
    let previewTempDir = '';
    if (hasImages) {
      previewTempDir = join(this.tempDir, `preview-dl-${Date.now()}`);
      downloadPromise = mkdir(previewTempDir, { recursive: true })
        .then(() => this.downloadSlideImages(slides, previewTempDir));
    }

    // ── Phase A: Text-only previews (renders while images download) ──
    this.events.emitSlideUpdated({
      presentationId: presentation.id,
      slideId: sortedSlides[0]?.id ?? '',
      data: { previewPhase: 'text', total: sortedSlides.length },
    });

    const textOnlySlides = sortedSlides.map((slide) => ({
      ...slide,
      imageUrl: null,
    })) as SlideModel[];

    const textOnlyMarkdown = this.marpExporter.generateMarpMarkdown(
      presentation,
      textOnlySlides,
      theme,
      layoutProfile,
      rendererOverrides,
      figmaBackgrounds,
    );

    const textOnlyBuffers = await this.marpExporter.renderSlideImages(textOnlyMarkdown);
    if (textOnlyBuffers.length > 0) {
      await this.uploadAndEmitPreviews(presentation, sortedSlides, textOnlyBuffers);
    }

    // ── Phase B: Full previews with images (downloads likely already complete) ──
    if (!hasImages) return;

    this.events.emitSlideUpdated({
      presentationId: presentation.id,
      slideId: sortedSlides[0]?.id ?? '',
      data: { previewPhase: 'images', total: sortedSlides.length },
    });

    const localPreviewSlides = await downloadPromise;
    if (!localPreviewSlides) return;

    const fullMarkdown = this.marpExporter.generateMarpMarkdown(
      presentation,
      localPreviewSlides,
      theme,
      layoutProfile,
      rendererOverrides,
      figmaBackgrounds,
    );

    const fullBuffers = await this.marpExporter.renderSlideImages(fullMarkdown);
    if (fullBuffers.length > 0) {
      await this.uploadAndEmitPreviews(presentation, sortedSlides, fullBuffers);
    }

    await this.cleanupSlideImages(previewTempDir);
  }
}
