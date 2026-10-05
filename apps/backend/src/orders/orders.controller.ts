import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { MerchantsService } from '../merchants/merchants.service.js';
import { OrdersService } from './orders.service.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { ConfirmHandoverDto } from './dto/confirm-handover.dto.js';

// Order *creation* lives in RacesController — a single-stop order is just a
// one-stop Race (racyeit.md Section 5). This controller reads/updates
// individual stops once they exist.
@Controller('orders')
@UseGuards(ClerkAuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly users: UsersService,
    private readonly merchants: MerchantsService,
  ) {}

  // Must come before `:id` so "mine" isn't swallowed as an order id.
  @Get('mine')
  async listMine(@CurrentUserId() clerkUserId: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    const merchant = await this.merchants.getForOwner(user.id);
    return this.orders.listForMerchant(merchant.id);
  }

  @Get(':id')
  async get(@CurrentUserId() clerkUserId: string, @Param('id') id: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.orders.getOrderForCustomer(id, user.id);
  }

  @Post(':id/sync-payment')
  async syncPayment(@CurrentUserId() clerkUserId: string, @Param('id') id: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.orders.syncPaymentStatus(id, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUserId() clerkUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    const merchant = await this.merchants.getForOwner(user.id);
    return this.orders.updateStatusForMerchant(id, merchant.id, dto.status);
  }

  @Post(':id/confirm-pickup')
  async confirmPickup(@CurrentUserId() clerkUserId: string, @Param('id') id: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.orders.confirmPickupByCustomer(id, user.id);
  }

  @Post(':id/confirm-handover')
  async confirmHandover(
    @CurrentUserId() clerkUserId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmHandoverDto,
  ) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    const merchant = await this.merchants.getForOwner(user.id);
    return this.orders.confirmHandoverByMerchant(id, merchant.id, dto.code);
  }
}
