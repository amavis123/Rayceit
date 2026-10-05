import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../stripe/stripe.service.js';
import { PushService } from '../push/push.service.js';

// Mirrors the lifecycle in racyeit.md Section 3 (pending -> preparing ->
// ready -> collected, with cancelled/no_show as early/late exits). Kept
// loose on purpose for the demo stage — no grace-period timers yet, a
// merchant can advance or cancel/no-show at any point in the forward flow.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['collected', 'no_show'],
  collected: [],
  no_show: [],
  cancelled: [],
};

export interface StopInput {
  merchantId: string;
  items: { productId: string; quantity: number }[];
}

const TERMINAL_STATUSES = ['collected', 'no_show', 'cancelled'];
export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function generateConfirmationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly push: PushService,
  ) {}

  // Creates a single stop (one Order + one Payment) within an already-created
  // Race. A single-stop trip is just a Race with one of these — see
  // racyeit.md Section 5 — so this is the one code path both RacesService
  // and single-stop callers go through.
  async createStopOrder(
    raceId: string,
    stopSequence: number,
    customerId: string,
    stop: StopInput,
  ) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: stop.merchantId } });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const productIds = stop.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, merchantId: stop.merchantId, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more items are no longer available');
    }

    const items = stop.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.price),
        prepTimeMinutes: product.prepTimeMinutes,
        quantity: item.quantity,
      };
    });
    const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const commissionRate = Number(this.config.get<string>('COMMISSION_RATE') ?? '0.10');
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const merchantPayoutAmount = Math.round((amount - commissionAmount) * 100) / 100;

    const order = await this.prisma.order.create({
      data: {
        raceId,
        stopSequence,
        customerId,
        merchantId: stop.merchantId,
        items,
        status: 'pending',
        confirmationCode: generateConfirmationCode(),
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount,
        commissionAmount,
        merchantPayoutAmount,
        status: 'pending',
      },
    });

    // Demo mode: a merchant may not have connected Stripe yet (RACE IT is
    // still gathering interest from both sides — see racyeit.md). The order
    // still gets created so the flow is fully clickable; checkout is
    // attempted only when the merchant can actually receive the money.
    let checkoutUrl: string | null = null;
    if (merchant.stripeConnectAccountId && merchant.stripeOnboardingComplete) {
      try {
        const appUrl = this.config.get<string>('CUSTOMER_APP_URL') ?? 'http://localhost:3002';
        const session = await this.stripe.createCheckoutSession({
          merchantStripeAccountId: merchant.stripeConnectAccountId,
          amount,
          commissionAmount,
          items,
          successUrl: `${appUrl}/orders/${order.id}/complete`,
          cancelUrl: `${appUrl}/merchants/${merchant.id}`,
        });
        checkoutUrl = session.url;
        if (session.paymentIntentId) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { stripePaymentIntentId: session.paymentIntentId },
          });
        }
      } catch {
        checkoutUrl = null;
      }
    }

    return { order, payment, checkoutUrl };
  }

  async getOrderForCustomer(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, merchant: true },
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async syncPaymentStatus(orderId: string, customerId: string) {
    const order = await this.getOrderForCustomer(orderId, customerId);
    if (!order.payment?.stripePaymentIntentId) {
      return order;
    }
    const status = await this.stripe.getPaymentIntentStatus(order.payment.stripePaymentIntentId);
    if (status === 'succeeded' && order.payment.status !== 'succeeded') {
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'succeeded' },
      });
      await this.prisma.order.update({ where: { id: order.id }, data: { status: 'preparing' } });
      return this.getOrderForCustomer(orderId, customerId);
    }
    return order;
  }

  async listForMerchant(merchantId: string) {
    return this.prisma.order.findMany({
      where: { merchantId },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatusForMerchant(orderId: string, merchantId: string, nextStatus: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.merchantId !== merchantId) {
      throw new ForbiddenException("You don't own this order");
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(`Can't move an order from "${order.status}" to "${nextStatus}"`);
    }

    return this.applyStatusChange(order.id, order.raceId, nextStatus);
  }

  // Dual handover confirmation (racyeit.md Section 3): either side can
  // trigger the same ready -> collected transition — the customer tapping
  // "Confirm pickup" in-app, or the merchant scanning/entering the code
  // shown on the customer's screen. Whichever happens first wins; this
  // isn't modeled as requiring both.
  async confirmPickupByCustomer(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'ready') {
      throw new BadRequestException('This order is not ready for pickup yet');
    }
    return this.applyStatusChange(order.id, order.raceId, 'collected');
  }

  async confirmHandoverByMerchant(orderId: string, merchantId: string, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.merchantId !== merchantId) {
      throw new ForbiddenException("You don't own this order");
    }
    if (order.status !== 'ready') {
      throw new BadRequestException('This order is not ready for pickup yet');
    }
    if (order.confirmationCode !== code) {
      throw new BadRequestException('That code doesn\'t match this order');
    }
    return this.applyStatusChange(order.id, order.raceId, 'collected');
  }

  private async applyStatusChange(orderId: string, raceId: string, nextStatus: string) {
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await this.completeRaceIfAllStopsDone(raceId);

    // Step 8 push trigger: notify the customer the moment their stop is
    // ready — see racyeit.md Section 10 step 8.
    if (nextStatus === 'ready') {
      const merchant = await this.prisma.merchant.findUnique({ where: { id: updated.merchantId } });
      await this.push.sendToUser(updated.customerId, {
        title: 'Your order is ready!',
        body: `${merchant?.businessName ?? 'Your stop'} has your order ready for pickup.`,
        url: `/races/${raceId}`,
      });
    }

    return updated;
  }

  private async completeRaceIfAllStopsDone(raceId: string) {
    const siblings = await this.prisma.order.findMany({ where: { raceId }, select: { status: true } });
    const allDone = siblings.every((o) => isTerminalOrderStatus(o.status));
    if (allDone) {
      await this.prisma.race.update({
        where: { id: raceId },
        data: { status: 'completed', completedAt: new Date() },
      });
    }
  }
}
