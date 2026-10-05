import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { UsersModule } from '../users/users.module.js';
import { StripeModule } from '../stripe/stripe.module.js';
import { MerchantsModule } from '../merchants/merchants.module.js';
import { PushModule } from '../push/push.module.js';

@Module({
  imports: [UsersModule, StripeModule, MerchantsModule, PushModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
