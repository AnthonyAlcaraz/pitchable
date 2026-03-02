import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CreditReason } from '../../generated/prisma/enums.js';

/** Threshold below which a low-credits email is sent */
const LOW_CREDITS_THRESHOLD = 5;
/** Minimum hours between low-credits alerts to avoid spamming */
const LOW_CREDITS_COOLDOWN_HOURS = 24;

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

    const result = await this.prisma.$transaction(async (tx) => {
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

      return { transaction, balanceAfter: updatedUser.creditBalance };
    });

    // Fire-and-forget low credits alert (outside transaction)
    if (result.balanceAfter < LOW_CREDITS_THRESHOLD) {
      void this.sendLowCreditsAlertIfNeeded(userId, result.balanceAfter);
    }

    return result.transaction;
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

  private async sendLowCreditsAlertIfNeeded(userId: string, balance: number): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, lowCreditsAlertedAt: true },
      });

      if (!user) return;

      // Check cooldown to avoid spamming
      if (user.lowCreditsAlertedAt) {
        const hoursSince = (Date.now() - user.lowCreditsAlertedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < LOW_CREDITS_COOLDOWN_HOURS) return;
      }

      // Mark as alerted first (prevents duplicate sends)
      await this.prisma.user.update({
        where: { id: userId },
        data: { lowCreditsAlertedAt: new Date() },
      });

      await this.emailService.sendLowCreditsEmail(user.email, user.name, balance);
      this.logger.log(`Low credits alert sent to ${user.email} (balance: ${balance})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send low credits alert: ${msg}`);
    }
  }
}
