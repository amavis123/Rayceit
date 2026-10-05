import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService, isTerminalOrderStatus } from '../orders/orders.service.js';
import type { CreateRaceDto } from './dto/create-race.dto.js';
import type { CreateLocationPingDto } from './dto/create-location-ping.dto.js';
import { estimateEtaMinutes, haversineKm } from './geo.js';
import { PushService } from '../push/push.service.js';

// Minutes-out threshold for the merchant "customer approaching" push —
// racyeit.md Section 10 step 8.
const APPROACHING_THRESHOLD_MINUTES = 10;

interface StoredOrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  prepTimeMinutes: number;
  quantity: number;
}

// Flat per-stop buffer (parking, walking up, waiting) added on top of each
// stop's own prep time when sanity-checking a customer's "done by" budget.
// A guess, not a real drive-time model — that needs step 6 (live ETA).
const PER_STOP_BUFFER_MINUTES = 5;

@Injectable()
export class RacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly push: PushService,
  ) {}

  async createRace(customerId: string, dto: CreateRaceDto) {
    const race = await this.prisma.race.create({
      data: {
        customerId,
        status: 'in_progress',
        startedAt: new Date(),
        timeBudgetMinutes: dto.timeBudgetMinutes,
      },
    });

    const stops = [];
    for (let i = 0; i < dto.stops.length; i++) {
      const stop = await this.orders.createStopOrder(race.id, i + 1, customerId, dto.stops[i]);
      stops.push(stop);
    }

    // Rough, non-blocking realism check — racyeit.md Section 8 left this as
    // an open question ("block or just warn?"); resolved here as "warn".
    let timeBudgetWarning: string | null = null;
    if (dto.timeBudgetMinutes) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: dto.stops.flatMap((s) => s.items.map((i) => i.productId)) } },
        select: { id: true, prepTimeMinutes: true },
      });
      const estimatedMinutes = dto.stops.reduce((sum, stop) => {
        const maxPrep = Math.max(
          ...stop.items.map((i) => products.find((p) => p.id === i.productId)?.prepTimeMinutes ?? 0),
        );
        return sum + maxPrep + PER_STOP_BUFFER_MINUTES;
      }, 0);
      if (estimatedMinutes > dto.timeBudgetMinutes) {
        timeBudgetWarning = `This looks tight — stops need roughly ${estimatedMinutes} min, your budget is ${dto.timeBudgetMinutes} min.`;
      }
    }

    return {
      race,
      stops: stops.map((s) => ({ order: s.order, payment: s.payment, checkoutUrl: s.checkoutUrl })),
      timeBudgetWarning,
    };
  }

  async getRaceForCustomer(raceId: string, customerId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: {
        orders: {
          include: { payment: true, merchant: true },
          orderBy: { stopSequence: 'asc' },
        },
      },
    });
    if (!race || race.customerId !== customerId) {
      throw new NotFoundException('Race not found');
    }
    return race;
  }

  // Records where the customer actually is right now and, from that, works
  // out a rough ETA to whichever stop is next — see geo.ts for the "no real
  // routing API" caveat. Also implements the Section 3 "prep trigger": once
  // the ETA gets as tight as the order's own prep time, start it
  // automatically rather than waiting for the merchant to notice.
  async recordLocationPing(raceId: string, customerId: string, dto: CreateLocationPingDto) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: { orders: { orderBy: { stopSequence: 'asc' } } },
    });
    if (!race || race.customerId !== customerId) {
      throw new NotFoundException('Race not found');
    }

    await this.prisma.locationPing.create({
      data: { raceId, customerId, lat: dto.lat, lng: dto.lng },
    });

    const currentOrder = race.orders.find((o) => !isTerminalOrderStatus(o.status));
    if (!currentOrder) {
      return { etaMinutes: null, currentOrderId: null, autoStarted: false };
    }

    const merchant = await this.prisma.merchant.findUnique({ where: { id: currentOrder.merchantId } });
    if (!merchant) {
      return { etaMinutes: null, currentOrderId: currentOrder.id, autoStarted: false };
    }

    const distanceKm = haversineKm(dto.lat, dto.lng, merchant.lat, merchant.lng);
    const etaMinutes = estimateEtaMinutes(distanceKm);
    const currentEta = new Date(Date.now() + etaMinutes * 60_000);

    await this.prisma.order.update({ where: { id: currentOrder.id }, data: { currentEta } });

    // Step 8 push trigger: tell the merchant once, the first time the
    // customer gets within the "approaching" window — not on every single
    // ping, hence the approachingNotifiedAt guard.
    if (etaMinutes <= APPROACHING_THRESHOLD_MINUTES && !currentOrder.approachingNotifiedAt) {
      await this.prisma.order.update({
        where: { id: currentOrder.id },
        data: { approachingNotifiedAt: new Date() },
      });
      await this.push.sendToUser(merchant.ownerId, {
        title: 'Customer approaching',
        body: `A customer is ~${etaMinutes} min away for their order.`,
        url: '/',
      });
    }

    let autoStarted = false;
    if (currentOrder.status === 'pending') {
      const items = currentOrder.items as unknown as StoredOrderItem[];
      const maxPrepTime = Math.max(0, ...items.map((i) => i.prepTimeMinutes));
      if (etaMinutes <= maxPrepTime) {
        await this.prisma.order.update({ where: { id: currentOrder.id }, data: { status: 'preparing' } });
        autoStarted = true;
      }
    }

    return { etaMinutes, currentOrderId: currentOrder.id, autoStarted };
  }
}
