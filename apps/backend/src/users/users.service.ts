import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getClerkClient } from '../auth/clerk-client.js';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByClerkId(clerkUserId: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { clerkUserId } });
    if (existing) {
      return existing;
    }

    const clerkUser = await getClerkClient().users.getUser(clerkUserId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error(`Clerk user ${clerkUserId} has no email address`);
    }

    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail;
    const authProvider = clerkUser.externalAccounts[0]?.provider ?? 'email';

    return this.prisma.user.create({
      data: {
        clerkUserId,
        name,
        email: primaryEmail,
        authProvider,
      },
    });
  }
}
