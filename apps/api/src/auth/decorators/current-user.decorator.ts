import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { HttpRequest } from '../../types/express.js';

export interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<HttpRequest>();
    return request.user as unknown as RequestUser;
  },
);
