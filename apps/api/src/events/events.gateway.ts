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

@WebSocketGateway({
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly jwtSecret: string;

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
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
      client.data['userId'] = payload.sub;
      client.data['email'] = payload.email;
      this.logger.log(
        `Client ${client.id} connected (user: ${payload.email})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
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
  }

  emitSlideAdded(event: SlideAddedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:added', event);
  }

  emitSlideRemoved(event: SlideRemovedEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('slide:removed', event);
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
  }

  emitGenerationProgress(event: GenerationProgressEvent): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('generation:progress', event);
  }

  emitImageGenerated(event: {
    presentationId: string;
    slideId: string;
    imageUrl: string;
  }): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('image:generated', event);
  }

  emitImagesComplete(event: { presentationId: string }): void {
    this.server
      .to(`presentation:${event.presentationId}`)
      .emit('images:complete', event);
  }
}
