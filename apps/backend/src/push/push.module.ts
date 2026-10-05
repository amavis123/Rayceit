import { Module } from '@nestjs/common';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
