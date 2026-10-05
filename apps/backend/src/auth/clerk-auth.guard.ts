import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string };
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secretKey = this.config.getOrThrow<string>('CLERK_SECRET_KEY');

    // @clerk/backend@3.22.0's types declare `{ data, errors }`, but this
    // version's verifyToken actually returns the payload directly on success
    // and throws on failure. Handle both shapes defensively in case that
    // changes again in a future Clerk release.
    let sub: string | undefined;
    try {
      const result = (await verifyToken(token, { secretKey })) as unknown as {
        sub?: string;
        data?: { sub?: string };
      };
      sub = result?.sub ?? result?.data?.sub;
    } catch {
      sub = undefined;
    }

    if (!sub) {
      throw new UnauthorizedException('Invalid session token');
    }

    request.auth = { userId: sub };
    return true;
  }
}
