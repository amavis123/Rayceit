import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMerchantDto } from './dto/create-merchant.dto.js';
import type { UpdateMerchantDto } from './dto/update-merchant.dto.js';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOwner(ownerId: string) {
    const merchant = await this.prisma.merchant.findFirst({ where: { ownerId } });
    if (!merchant) {
      throw new NotFoundException('No merchant profile yet');
    }
    return merchant;
  }

  async createForOwner(ownerId: string, dto: CreateMerchantDto) {
    const existing = await this.prisma.merchant.findFirst({ where: { ownerId } });
    if (existing) {
      throw new ConflictException('This account already has a merchant profile');
    }
    return this.prisma.merchant.create({
      data: { ...dto, ownerId },
    });
  }

  async updateForOwner(ownerId: string, dto: UpdateMerchantDto) {
    const merchant = await this.getForOwner(ownerId);
    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: dto,
    });
  }

  async setStripeAccountId(merchantId: string, stripeConnectAccountId: string) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { stripeConnectAccountId },
    });
  }

  async setStripeOnboardingComplete(merchantId: string, complete: boolean) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        stripeOnboardingComplete: complete,
        status: complete ? 'active' : 'onboarding',
      },
    });
  }

  // Not gated on `status === 'active'` (i.e. Stripe onboarding complete) so
  // browsing/ordering is testable before a merchant has connected Stripe.
  // Before a real launch, this should filter to active merchants only —
  // see racyeit.md step 3 decision log entry.
  async listPublic() {
    return this.prisma.merchant.findMany({ orderBy: { businessName: 'asc' } });
  }

  async getPublicById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    return merchant;
  }
}
