import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard.js';
import { RequireScopes } from '../api-keys/decorators/require-scopes.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { PresentationsService } from '../presentations/presentations.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { ExportsService } from '../exports/exports.service.js';
import { PitchBriefService } from '../pitch-brief/pitch-brief.service.js';
import { PitchLensService } from '../pitch-lens/pitch-lens.service.js';
import { SyncGenerationService } from './sync-generation.service.js';
import { EmailService } from '../email/email.service.js';
import { ExportFormat } from '../../generated/prisma/enums.js';
import { GenerateDto, ExportDto, ForkDto, EmailDto } from './dto/generate.dto.js';

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
export class ApiV1Controller {
  constructor(
    private readonly presentationsService: PresentationsService,
    private readonly creditsService: CreditsService,
    private readonly syncGeneration: SyncGenerationService,
    private readonly exportsService: ExportsService,
    private readonly pitchBriefService: PitchBriefService,
    private readonly pitchLensService: PitchLensService,
    private readonly emailService: EmailService,
  ) {}

  // -- Presentations --------------------------------------------------

  @Get('presentations')
  @RequireScopes('presentations:read')
  async listPresentations(@CurrentUser() user: RequestUser) {
    return this.presentationsService.findAll(user.userId);
  }

  @Get('presentations/:id')
  @RequireScopes('presentations:read')
  async getPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.presentationsService.findOne(id, user.userId);
  }

  @Delete('presentations/:id')
  @RequireScopes('presentations:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.presentationsService.delete(id, user.userId);
  }

  @Post('presentations/:id/fork')
  @RequireScopes('presentations:write')
  @HttpCode(HttpStatus.CREATED)
  async forkPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ForkDto,
  ) {
    return this.presentationsService.fork(id, user.userId, dto);
  }

  // -- Generation -----------------------------------------------------

  @Post('generate')
  @RequireScopes('generation')
  @HttpCode(HttpStatus.CREATED)
  async generate(@CurrentUser() user: RequestUser, @Body() dto: GenerateDto) {
    return this.syncGeneration.generate(user.userId, dto);
  }

  // -- Export ---------------------------------------------------------

  @Post('presentations/:id/export')
  @RequireScopes('export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportDto,
  ) {
    // Verify ownership first
    await this.presentationsService.findOne(id, user.userId);
    const format = dto.format as ExportFormat;
    const job = await this.exportsService.createExportJob(id, format);
    // Process synchronously so the job is ready for download
    await this.exportsService.processExport(job.id);
    return this.exportsService.getExportStatus(job.id);
  }

  // -- Email ----------------------------------------------------------

  @Post('presentations/:id/email')
  @RequireScopes('export')
  @HttpCode(HttpStatus.OK)
  async emailPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EmailDto,
  ) {
    // Verify ownership
    const presentation = await this.presentationsService.findOne(id, user.userId);

    const format = (dto.format?.toUpperCase() === 'PPTX'
      ? ExportFormat.PPTX
      : ExportFormat.PDF) as ExportFormat;
    const formatLabel = format === ExportFormat.PPTX ? 'PPTX' : 'PDF';

    // Get email address
    const emailAddress = dto.email || user.email;
    if (!emailAddress) {
      return { sent: false, error: 'No email address provided or found on user account' };
    }

    // Generate export buffer
    const job = await this.exportsService.createExportJob(id, format);
    const buffer = await this.exportsService.processExportAndGetBuffer(job.id);

    const title = presentation.title || 'Presentation';
    const slideCount = presentation.slides?.length ?? 0;
    const html = this.emailService.buildPresentationEmailHtml(title, slideCount, formatLabel);
    const filename = `${title.replace(/[^a-zA-Z0-9 -]/g, '').trim()}.${formatLabel.toLowerCase()}`;

    const result = await this.emailService.sendEmail({
      to: emailAddress,
      subject: `Pitchable: ${title}`,
      html,
      attachments: [{ filename, content: buffer.toString('base64') }],
    });

    return { sent: result.success, to: emailAddress, error: result.error };
  }

  // -- Briefs & Lenses ------------------------------------------------

  @Get('briefs')
  @RequireScopes('presentations:read')
  async listBriefs(@CurrentUser() user: RequestUser) {
    return this.pitchBriefService.findAll(user.userId);
  }

  @Get('lenses')
  @RequireScopes('presentations:read')
  async listLenses(@CurrentUser() user: RequestUser) {
    return this.pitchLensService.findAll(user.userId);
  }

  // -- Credits --------------------------------------------------------

  @Get('credits/balance')
  @RequireScopes('presentations:read')
  async getBalance(@CurrentUser() user: RequestUser) {
    const balance = await this.creditsService.getBalance(user.userId);
    return { balance };
  }
}
