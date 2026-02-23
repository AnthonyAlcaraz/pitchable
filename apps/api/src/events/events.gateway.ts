import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventStreamService } from './event-stream.service.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface SlideUpdateEvent {
  presentationId: string;
  slideId: string;
  data: Record<string, unknown>;
}

export interface SlideAddedEvent {
  presentationId: string;
  slide: Record<string, unknown>;
  position: number;
}

export interface SlideRemovedEvent {
  presentationId: string;
  slideId: string;
}

export interface SlideReorderedEvent {
  presentationId: string;
  slideIds: string[];
}

export interface ThemeChangedEvent {
  presentationId: string;
  themeId: string;
  theme: Record<string, unknown>;
}

export interface GenerationProgressEvent {
  presentationId: string;
  step: string;
  progress: number;
  message: string;
}

export interface DocumentProgressEvent {
  documentId: string;
  step: string;
  progress: number; // 0-100, or -1 for error
  message: string;
}

export interface ExportProgressEvent {
  presentationId: string;
  jobId: string;
  step: string;
  progress: number; // 0-100, or -1 for error
  message: string;
}

export interface CascadeProgressEvent {
  presentationId: string;
  currentSlide: number;
  totalSlides: number;
  slideId: string;
  slideTitle: string;
  status: 'regenerating' | 'complete';
}

export interface CascadeCompleteEvent {
  presentationId: string;
}

export interface SlideVerificationEvent {
  presentationId: string;
  slideId: string;
  slideNumber: number;
  status: 'verifying' | 'verified' | 'fixed';
  score?: number;
}

export interface VerificationCompleteEvent {
  presentationId: string;
  passed: boolean;
  metrics: {
    avgStyleScore: number;
    narrativeScore: number;
    avgFactScore: number;
    slidesFixed: number;
  };
}

/** Max WebSocket connections per user (prevents resource exhaustion). */
const MAX_CONNECTIONS_PER_USER = 10;

@WebSocketGateway({
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
  pingInterval: 15000,
  pingTimeout: 10000,
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly jwtSecret: string;

  /** Track active connections per userId for rate limiting. */
  private readonly userConnections = new Map<string, Set<string>>();

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventStream: EventStreamService,
  ) {
    this.jwtSecret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      configService.get<string>('JWT_SECRET', '');
  }

  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.auth?.['token'] as string) ||
        (client.handshake.headers?.['authorization'] as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = verify(token, this.jwtSecret) as JwtPayload;
      const userId = payload.sub;
      client.data['userId'] = userId;
      client.data['email'] = payload.email;

      // Per-user connection limit
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      const conns = this.userConnections.get(userId)!;

      if (conns.size >= MAX_CONNECTIONS_PER_USER) {
        this.logger.warn(
          `Client ${client.id} rejected: user ${payload.email} has ${conns.size}/${MAX_CONNECTIONS_PER_USER} connections`,
        );
        client.emit('error', { message: 'Too many concurrent connections. Close some tabs and retry.' });
        client.disconnect();
        return;
      }

      conns.add(client.id);
      this.logger.log(
        `Client ${client.id} connected (user: ${payload.email}, connections: ${conns.size})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data['userId'] as string | undefined;
    if (userId) {
      const conns = this.userConnections.get(userId);
      if (conns) {
        conns.delete(client.id);
        if (conns.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join:presentation')
  async handleJoinPresentation(
    @ConnectedSocket() client: Socket,
    @MessageBody() presentationId: string,
  ): Promise<void> {
    // Verify ownership before allowing room join
    const userId = client.data['userId'] as string | undefined;
    if (!userId) {
      this.logger.warn(`Client ${client.id} tried to join room without auth`);
      return;
    }

    // Skip join for "new" — presentation doesn't exist yet
    if (presentationId === 'new') {
      return;
    }

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { userId: true },
    });

    if (!presentation || presentation.userId !== userId) {
      this.logger.warn(
        `Client ${client.id} denied access to presentation ${presentationId}`,
      );
      client.emit('error', { message: 'Access denied to this presentation' });
      return;
    }

    const room = `presentation:${presentationId}`;
    client.join(room);
    this.logger.debug(
      `Client ${client.id} joined room ${room}`,
    );
  }

  @SubscribeMessage('leave:presentation')
  handleLeavePresentation(
    @ConnectedSocket() client: Socket,
    @MessageBody() presentationId: string,
  ): void {
    const room = `presentation:${presentationId}`;
    client.leave(room);
    this.logger.debug(
      `Client ${client.id} left room ${room}`,
    );
  }

  // --- Server-side emit helpers (called by other services) ---

  emitSlideUpdated(event: SlideUpdateEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:updated', event);
    this.eventStream.appendEvent({
      type: 'slide_edit',
      presentationId: event.presentationId,
      data: event.data,
    });
  }

  emitSlideAdded(event: SlideAddedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:added', event);
    this.eventStream.appendEvent({
      type: 'slide_add',
      presentationId: event.presentationId,
      data: { slide: event.slide, position: event.position },
    });
  }

  emitSlideRemoved(event: SlideRemovedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:removed', event);
    this.eventStream.appendEvent({
      type: 'slide_remove',
      presentationId: event.presentationId,
      data: { slideId: event.slideId },
    });
  }

  emitSlideReordered(event: SlideReorderedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:reordered', event);
  }

  emitThemeChanged(event: ThemeChangedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('presentation:themeChanged', event);
    this.eventStream.appendEvent({
      type: 'theme_change',
      presentationId: event.presentationId,
      data: { themeId: event.themeId, theme: event.theme },
    });
  }

  emitGenerationProgress(event: GenerationProgressEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('generation:progress', event);
    this.eventStream.appendEvent({
      type: 'generation_progress',
      presentationId: event.presentationId,
      data: { step: event.step, progress: event.progress, message: event.message },
    });
  }

  emitImageGenerated(event: {
    presentationId: string;
    slideId: string;
    imageUrl: string;
  }): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('image:generated', event);
    this.eventStream.appendEvent({
      type: 'image_generated',
      presentationId: event.presentationId,
      data: { slideId: event.slideId, imageUrl: event.imageUrl },
    });
  }

  emitImagesComplete(event: { presentationId: string }): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('images:complete', event);
  }

  emitImageSelectionRequest(event: {
    presentationId: string;
    slideId: string;
    contextId: string;
    candidates: Array<{ id: string; imageUrl: string; score: number; prompt: string }>;
    defaultImageId: string;
    timeoutMs: number;
  }): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('image:selectionRequest', event);
  }

  emitExportProgress(presentationId: string, event: ExportProgressEvent): void {
    this.server
      .to(`presentation:${presentationId}`)
      .emit('export:progress', event);
    this.eventStream.appendEvent({
      type: 'export_progress',
      presentationId: event.presentationId,
      data: { jobId: event.jobId, step: event.step, progress: event.progress, message: event.message },
    });
  }

  emitDocumentProgress(userId: string, event: DocumentProgressEvent): void {
    const connIds = this.userConnections.get(userId);
    if (!connIds || connIds.size === 0) return;
    for (const socketId of connIds) {
      this.server.to(socketId).emit('document:progress', event);
    }
  }

  emitCascadeProgress(event: CascadeProgressEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('cascade:progress', event);
  }

  emitCascadeComplete(event: CascadeCompleteEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('cascade:complete', event);
  }

  emitSlideVerification(event: SlideVerificationEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:verification', event);
  }

  emitVerificationComplete(event: VerificationCompleteEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('verification:complete', event);
  }
}
