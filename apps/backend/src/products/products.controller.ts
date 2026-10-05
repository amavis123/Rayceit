import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { MerchantsService } from '../merchants/merchants.service.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Controller('products')
@UseGuards(ClerkAuthGuard)
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly merchants: MerchantsService,
    private readonly users: UsersService,
  ) {}

  private async myMerchantId(clerkUserId: string): Promise<string> {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    const merchant = await this.merchants.getForOwner(user.id);
    return merchant.id;
  }

  @Get('mine')
  async listMine(@CurrentUserId() clerkUserId: string) {
    const merchantId = await this.myMerchantId(clerkUserId);
    return this.products.listForMerchant(merchantId);
  }

  @Post()
  async create(@CurrentUserId() clerkUserId: string, @Body() dto: CreateProductDto) {
    const merchantId = await this.myMerchantId(clerkUserId);
    return this.products.createForMerchant(merchantId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUserId() clerkUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const merchantId = await this.myMerchantId(clerkUserId);
    return this.products.update(id, merchantId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUserId() clerkUserId: string, @Param('id') id: string) {
    const merchantId = await this.myMerchantId(clerkUserId);
    await this.products.remove(id, merchantId);
  }
}
