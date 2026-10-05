import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { MerchantsModule } from '../merchants/merchants.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [MerchantsModule, ProductsModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
