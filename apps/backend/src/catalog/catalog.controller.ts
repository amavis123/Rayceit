import { Controller, Get, Param } from '@nestjs/common';
import { MerchantsService } from '../merchants/merchants.service.js';
import { ProductsService } from '../products/products.service.js';

// Public, unauthenticated browsing — no ClerkAuthGuard. Anyone can see the
// catalog; placing an order is what requires sign-in (see OrdersController).
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly merchants: MerchantsService,
    private readonly products: ProductsService,
  ) {}

  @Get('merchants')
  async listMerchants() {
    return this.merchants.listPublic();
  }

  @Get('merchants/:id')
  async getMerchant(@Param('id') id: string) {
    return this.merchants.getPublicById(id);
  }

  @Get('merchants/:id/products')
  async getMerchantProducts(@Param('id') id: string) {
    return this.products.listActiveForMerchant(id);
  }
}
