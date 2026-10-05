import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { UsersModule } from '../users/users.module.js';
import { MerchantsModule } from '../merchants/merchants.module.js';

@Module({
  imports: [UsersModule, MerchantsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
