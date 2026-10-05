import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly client: Stripe;

  constructor(private readonly config: ConfigService) {
    // Falls back to a placeholder so the app can boot and every other
    // feature works before a real Stripe account is connected. Calls here
    // will fail with a clear Stripe auth error until STRIPE_SECRET_KEY is set.
    this.client = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_not_configured');
  }

  async createExpressAccount(email: string) {
    // RACE IT launches in Australia first — see racyeit.md.
    const account = await this.client.accounts.create({
      type: 'express',
      email,
      country: 'AU',
      default_currency: 'aud',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  }

  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
    const link = await this.client.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });
    return link.url;
  }

  async getAccountStatus(accountId: string) {
    const account = await this.client.accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  async createCheckoutSession(params: {
    merchantStripeAccountId: string;
    amount: number;
    commissionAmount: number;
    items: { name: string; unitPrice: number; quantity: number }[];
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; paymentIntentId: string | null }> {
    const toCents = (n: number) => Math.round(n * 100);

    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: params.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'aud',
          unit_amount: toCents(item.unitPrice),
          product_data: { name: item.name },
        },
      })),
      payment_intent_data: {
        application_fee_amount: toCents(params.commissionAmount),
        transfer_data: { destination: params.merchantStripeAccountId },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return {
      url: session.url,
      paymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
    };
  }

  async getPaymentIntentStatus(paymentIntentId: string) {
    const intent = await this.client.paymentIntents.retrieve(paymentIntentId);
    return intent.status;
  }
}
