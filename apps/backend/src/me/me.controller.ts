import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';

@Controller('me')
@UseGuards(ClerkAuthGuard)
export class MeController {
  @Get()
  getMe(@CurrentUserId() clerkUserId: string) {
    return { clerkUserId };
  }
}
