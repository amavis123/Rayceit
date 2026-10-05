import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { PushService } from './push.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';

@Controller('push')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly users: UsersService,
  ) {}

  // Public — the frontend needs this before a user signs in to even set up
  // the PushManager subscription.
  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(ClerkAuthGuard)
  async subscribe(@CurrentUserId() clerkUserId: string, @Body() dto: SubscribeDto) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    await this.push.subscribe(user.id, dto);
    return { ok: true };
  }
}
