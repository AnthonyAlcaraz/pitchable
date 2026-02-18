import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FigmaService } from './figma.service.js';
import { FigmaImageSyncService } from './figma-image-sync.service.js';
import { ConnectFigmaDto } from './dto/connect-figma.dto.js';
import { AssignFigmaFrameDto } from './dto/assign-figma-frame.dto.js';

interface AuthRequest {
  user: { sub: string };
}

@Controller('figma')
@UseGuards(JwtAuthGuard)
export class FigmaController {
  constructor(
    private readonly figmaService: FigmaService,
    private readonly figmaImageSync: FigmaImageSyncService,
  ) {}

  /** Save Figma personal access token (user-level). */
  @Post('connect')
  async connect(
    @Request() req: AuthRequest,
    @Body() dto: ConnectFigmaDto,
  ) {
    await this.figmaService.saveToken(req.user.sub, dto.accessToken);
    return { connected: true };
  }

  /** Remove Figma integration. */
  @Delete('disconnect')
  async disconnect(@Request() req: AuthRequest) {
    await this.figmaService.disconnect(req.user.sub);
    return { connected: false };
  }

  /** Check Figma connection status. */
  @Get('status')
  async status(@Request() req: AuthRequest) {
    return this.figmaService.getStatus(req.user.sub);
  }

  /** Re-validate stored Figma token. */
  @Post('validate')
  async validate(@Request() req: AuthRequest) {
    const valid = await this.figmaService.validateToken(req.user.sub);
    return { valid };
  }

  /**
   * Browse frames in a Figma file.
   * File key is extracted from URLs like: https://www.figma.com/design/FILE_KEY/title
   */
  @Get('files/:fileKey')
  async getFileFrames(
    @Request() req: AuthRequest,
    @Param('fileKey') fileKey: string,
    @Query('lensId') lensId?: string,
  ) {
    const token = await this.figmaService.resolveToken(
      req.user.sub,
      lensId,
    );

    if (!token) {
      return {
        error: 'No Figma token found. Connect via settings or Pitch Lens.',
        frames: [],
      };
    }

    const frames = await this.figmaService.getFrames(token, fileKey);
    return { frames };
  }

  /** Assign a Figma frame to a slide (exports PNG → S3 → Slide.imageUrl). */
  @Post('slides/:slideId/assign')
  async assignFrame(
    @Request() req: AuthRequest,
    @Param('slideId') slideId: string,
    @Body() dto: AssignFigmaFrameDto,
    @Query('lensId') lensId?: string,
  ) {
    const imageUrl = await this.figmaImageSync.syncFigmaFrameToSlide(
      slideId,
      req.user.sub,
      dto.fileKey,
      dto.nodeId,
      lensId,
    );
    return { imageUrl };
  }

  /** Re-sync a Figma-sourced slide image (when designer updates the frame). */
  @Post('slides/:slideId/refresh')
  async refreshFrame(
    @Request() req: AuthRequest,
    @Param('slideId') slideId: string,
    @Query('lensId') lensId?: string,
  ) {
    const imageUrl = await this.figmaImageSync.refreshFigmaImage(
      slideId,
      req.user.sub,
      lensId,
    );
    return { imageUrl };
  }
}
