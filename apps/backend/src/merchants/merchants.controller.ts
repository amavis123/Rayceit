import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { MerchantsService } from './merchants.service.js';
import { CreateMerchantDto } from './dto/create-merchant.dto.js';
import { UpdateMerchantDto } from './dto/update-merchant.dto.js';

@Controller('merchants')
@UseGuards(ClerkAuthGuard)
export class MerchantsController {
  constructor(
    private readonly merchants: MerchantsService,
    private readonly users: UsersService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  async getMine(@CurrentUserId() clerkUserId: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    try {
      return await this.merchants.getForOwner(user.id);
    } catch {
      throw new NotFoundException('No merchant profile yet');
    }
  }

  @Post()
  async create(@CurrentUserId() clerkUserId: string, @Body() dto: CreateMerchantDto) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.merchants.createForOwner(user.id, dto);
  }

  @Patch('me')
  async updateMine(@CurrentUserId() clerkUserId: string, @Body() dto: UpdateMerchantDto) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.merchants.updateForOwner(user.id, dto);
  }

  @Post('me/stripe/onboarding-link')
  async getStripeOnboardingLink(@CurrentUserId() clerkUserId: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    let merchant = await this.merchants.getForOwner(user.id);

    if (!merchant.stripeConnectAccountId) {
      const accountId = await this.stripe.createExpressAccount(user.email);
      merchant = await this.merchants.setStripeAccountId(merchant.id, accountId);
    }

    const appUrl = this.config.get<string>('MERCHANT_APP_URL') ?? 'http://localhost:3003';
    const url = await this.stripe.createOnboardingLink(
      merchant.stripeConnectAccountId!,
      `${appUrl}/stripe/refresh`,
      `${appUrl}/stripe/complete`,
    );
    return { url };
  }

  @Get('me/stripe/status')
  async getStripeStatus(@CurrentUserId() clerkUserId: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    const merchant = await this.merchants.getForOwner(user.id);

    if (!merchant.stripeConnectAccountId) {
      return { connected: false, chargesEnabled: false, detailsSubmitted: false };
    }

    const status = await this.stripe.getAccountStatus(merchant.stripeConnectAccountId);
    if (status.chargesEnabled !== merchant.stripeOnboardingComplete) {
      await this.merchants.setStripeOnboardingComplete(merchant.id, status.chargesEnabled);
    }
    return { connected: true, ...status };
  }
}
