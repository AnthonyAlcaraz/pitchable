import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditReason } from '../../generated/prisma/enums.js';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    return user.creditBalance;
  }

  async addCredits(
    userId: string,
    amount: number,
    reason: CreditReason,
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          reason,
          referenceId: referenceId ?? null,
          balanceAfter: user.creditBalance,
        },
      });

      return transaction;
    });
  }

  async deductCredits(
    userId: string,
    amount: number,
    reason: CreditReason,
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Deduction amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (!user) {
        throw new NotFoundException(`User with id "${userId}" not found`);
      }

      if (user.creditBalance < amount) {
        throw new BadRequestException(
          `Insufficient credits: balance is ${user.creditBalance}, requested ${amount}`,
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { decrement: amount } },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          reason,
          referenceId: referenceId ?? null,
          balanceAfter: updatedUser.creditBalance,
        },
      });

      return transaction;
    });
  }

  async getHistory(userId: string, limit = 50) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async hasEnoughCredits(
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }
}
