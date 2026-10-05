import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SubscribeDto } from './dto/subscribe.dto.js';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly publicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.publicKey = this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY') ?? '';
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
    if (this.publicKey && privateKey) {
      webpush.setVapidDetails(subject, this.publicKey, privateKey);
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  // Never throws — a push failure shouldn't break the order-status update or
  // location-ping request that triggered it. Expired subscriptions (the
  // browser revoked them) get cleaned up as they're found.
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.publicKey) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`Push send failed for user ${userId}: ${String(err)}`);
          }
        }
      }),
    );
  }
}
