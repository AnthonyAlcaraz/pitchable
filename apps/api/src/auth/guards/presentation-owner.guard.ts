import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RequestUser } from '../decorators/current-user.decorator.js';

/**
 * Guard that verifies the authenticated user owns the presentation
 * referenced by :presentationId in the route params.
 * Allows "new" as a special value — the controller handles creation.
 */
@Injectable()
export class PresentationOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    const presentationId =
      request.params?.['presentationId'] ?? request.params?.['id'];

    if (!presentationId || !user?.userId) {
      throw new ForbiddenException('Missing authentication or presentation ID');
    }

    // Allow "new" — the controller will create the presentation
    if (presentationId === 'new') {
      return true;
    }

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { userId: true },
    });

    if (!presentation) {
      throw new NotFoundException(`Presentation ${presentationId} not found`);
    }

    if (presentation.userId !== user.userId) {
      throw new ForbiddenException('You do not own this presentation');
    }

    return true;
  }
}
