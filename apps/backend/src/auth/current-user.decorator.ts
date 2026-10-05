import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest } from './clerk-auth.guard.js';

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.auth) {
    throw new Error('CurrentUserId used outside of ClerkAuthGuard');
  }
  return request.auth.userId;
});
