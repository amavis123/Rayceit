import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { MeModule } from './me/me.module.js';
import { UsersModule } from './users/users.module.js';
import { MerchantsModule } from './merchants/merchants.module.js';
import { ProductsModule } from './products/products.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { RacesModule } from './races/races.module.js';
import { PushModule } from './push/push.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MeModule,
    UsersModule,
    MerchantsModule,
    ProductsModule,
    CatalogModule,
    OrdersModule,
    RacesModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
