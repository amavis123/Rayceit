import { Module } from '@nestjs/common';
import { RacesController } from './races.controller.js';
import { RacesService } from './races.service.js';
import { UsersModule } from '../users/users.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PushModule } from '../push/push.module.js';

@Module({
  imports: [UsersModule, OrdersModule, PushModule],
  controllers: [RacesController],
  providers: [RacesService],
})
export class RacesModule {}
