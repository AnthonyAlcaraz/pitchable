import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { FigmaService } from './figma.service.js';
import { FigmaImageSyncService } from './figma-image-sync.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { randomBytes } from 'crypto';

interface FigmaWebhookPayload {
  event_type: string;
  file_key: string;
  file_name: string;
  passcode: string;
  timestamp: string;
  webhook_id: string;
}

@Injectable()
export class FigmaWebhookService {
  private readonly logger = new Logger(FigmaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly figmaService: FigmaService,
    private readonly figmaImageSync: FigmaImageSyncService,
    private readonly events: EventsGateway,
    @InjectQueue('figma-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * Register a webhook with Figma for file update events.
   */
  async registerWebhook(
    userId: string,
    fileKey: string,
    callbackUrl: string,
  ): Promise<{ webhookId: string }> {
    const token = await this.figmaService.resolveToken(userId);
    if (!token) {
      throw new Error('No Figma token found. Connect Figma first.');
    }
    const passcode = randomBytes(16).toString('hex');

    // Register with Figma API
    const response = await fetch('https://api.figma.com/v2/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_type: 'FILE_UPDATE',
        team_id: await this.getTeamId(token, fileKey),
        endpoint: callbackUrl,
        passcode,
        description: `Pitchable sync for ${fileKey}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to register Figma webhook: ${err}`);
    }

    const data = await response.json() as { id: string };

    // Store webhook record
    await this.prisma.figmaWebhook.create({
      data: {
        userId,
        fileKey,
        webhookId: data.id,
        passcode,
      },
    });

    this.logger.log(`Registered Figma webhook ${data.id} for file ${fileKey}`);
    return { webhookId: data.id };
  }

  /**
   * Handle incoming webhook callback from Figma.
   */
  async handleCallback(payload: FigmaWebhookPayload): Promise<void> {
    // Validate passcode
    const webhook = await this.prisma.figmaWebhook.findUnique({
      where: { webhookId: payload.webhook_id },
    });

    if (!webhook || webhook.passcode !== payload.passcode) {
      this.logger.warn(`Invalid webhook callback: ${payload.webhook_id}`);
      return;
    }

    if (!webhook.isActive) {
      this.logger.warn(`Webhook ${payload.webhook_id} is inactive, ignoring`);
      return;
    }

    // Update last event timestamp
    await this.prisma.figmaWebhook.update({
      where: { id: webhook.id },
      data: { lastEventAt: new Date() },
    });

    // Add debounced job (10s delay, deduplicate by fileKey)
    await this.syncQueue.add(
      'process-file-update',
      { fileKey: payload.file_key, userId: webhook.userId },
      {
        delay: 10000,
        jobId: `figma-sync-${payload.file_key}`,
        removeOnComplete: true,
        removeOnFail: 5,
      },
    );

    this.logger.log(`Queued sync job for file ${payload.file_key}`);
  }

  /**
   * Process a file update: re-export images for all slides linked to this file.
   */
  async processFileUpdate(fileKey: string, userId: string): Promise<void> {
    const slides = await this.prisma.slide.findMany({
      where: { figmaFileKey: fileKey },
      select: {
        id: true,
        presentationId: true,
        figmaNodeId: true,
        presentation: { select: { pitchLensId: true } },
      },
    });

    if (slides.length === 0) {
      this.logger.log(`No slides linked to file ${fileKey}, skipping sync`);
      return;
    }

    this.logger.log(`Processing file update for ${fileKey}: ${slides.length} slides`);

    for (const slide of slides) {
      try {
        if (!slide.figmaNodeId) continue;

        const imageUrl = await this.figmaImageSync.refreshFigmaImage(
          slide.id,
          userId,
          slide.presentation?.pitchLensId,
        );

        // Update sync metadata
        await this.prisma.slide.update({
          where: { id: slide.id },
          data: {
            figmaLastSyncAt: new Date(),
            figmaSyncVersion: { increment: 1 },
          },
        });

        // Emit event to frontend
        this.events.emitImageGenerated({
          presentationId: slide.presentationId,
          slideId: slide.id,
          imageUrl,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to sync slide ${slide.id}: ${msg}`);
      }
    }
  }

  /**
   * Deregister a webhook from Figma.
   */
  async deregisterWebhook(webhookDbId: string, userId: string): Promise<void> {
    const webhook = await this.prisma.figmaWebhook.findUnique({
      where: { id: webhookDbId },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException();

    // Delete from Figma
    try {
      const token = await this.figmaService.resolveToken(userId);
      await fetch(`https://api.figma.com/v2/webhooks/${webhook.webhookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: unknown) {
      this.logger.warn(`Failed to delete webhook from Figma: ${err}`);
    }

    await this.prisma.figmaWebhook.delete({ where: { id: webhookDbId } });
    this.logger.log(`Deregistered webhook ${webhook.webhookId}`);
  }

  /**
   * List all webhooks for a user.
   */
  async listWebhooks(userId: string) {
    return this.prisma.figmaWebhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the team ID for a Figma file.
   */
  private async getTeamId(token: string, fileKey: string): Promise<string> {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file info: ${response.status}`);
    }

    const data = await response.json() as { teamId?: string; team_id?: string };
    const teamId = data.teamId || data.team_id;

    if (!teamId) {
      throw new Error('Could not determine team ID for this file. Webhooks require a team-level Figma plan.');
    }

    return teamId;
  }
}
