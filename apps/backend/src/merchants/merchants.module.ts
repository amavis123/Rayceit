import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller.js';
import { MerchantsService } from './merchants.service.js';
import { UsersModule } from '../users/users.module.js';
import { StripeModule } from '../stripe/stripe.module.js';

@Module({
  imports: [UsersModule, StripeModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
