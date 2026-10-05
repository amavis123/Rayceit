import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { RacesService } from './races.service.js';
import { CreateRaceDto } from './dto/create-race.dto.js';
import { CreateLocationPingDto } from './dto/create-location-ping.dto.js';

@Controller('races')
@UseGuards(ClerkAuthGuard)
export class RacesController {
  constructor(
    private readonly races: RacesService,
    private readonly users: UsersService,
  ) {}

  @Post()
  async create(@CurrentUserId() clerkUserId: string, @Body() dto: CreateRaceDto) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.races.createRace(user.id, dto);
  }

  @Get(':id')
  async get(@CurrentUserId() clerkUserId: string, @Param('id') id: string) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.races.getRaceForCustomer(id, user.id);
  }

  @Post(':id/location-pings')
  async addLocationPing(
    @CurrentUserId() clerkUserId: string,
    @Param('id') id: string,
    @Body() dto: CreateLocationPingDto,
  ) {
    const user = await this.users.findOrCreateByClerkId(clerkUserId);
    return this.races.recordLocationPing(id, user.id, dto);
  }
}
