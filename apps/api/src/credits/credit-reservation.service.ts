import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditReason } from '../../generated/prisma/enums.js';

const RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class CreditReservationService {
  private readonly logger = new Logger(CreditReservationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserve credits atomically. Throws if insufficient available balance.
   * The user's creditBalance is NOT decremented — only a reservation record is created.
   * Available balance = creditBalance - sum(active reservations).
   */
  async reserve(
    userId: string,
    amount: number,
    reason: CreditReason,
    referenceId?: string,
  ): Promise<{ reservationId: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Reservation amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (!user) {
        throw new NotFoundException(`User "${userId}" not found`);
      }

      const reserved = await this.sumActiveReservations(tx, userId);
      const available = user.creditBalance - reserved;

      if (available < amount) {
        throw new BadRequestException(
          `Insufficient credits: ${available} available (${user.creditBalance} balance - ${reserved} reserved), requested ${amount}`,
        );
      }

      const reservation = await tx.creditReservation.create({
        data: {
          userId,
          amount,
          reason,
          referenceId: referenceId ?? null,
          status: 'reserved',
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
      });

      this.logger.log(
        `Reserved ${amount} credits for user ${userId} (reservation ${reservation.id})`,
      );

      return { reservationId: reservation.id };
    });
  }

  /**
   * Commit a reservation: deduct credits from the user and mark as committed.
   * Called when the operation (e.g. image generation) succeeds.
   */
  async commit(reservationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation "${reservationId}" not found`);
      }

      if (reservation.status !== 'reserved') {
        this.logger.warn(
          `Reservation ${reservationId} already ${reservation.status}, skipping commit`,
        );
        return;
      }

      // Deduct from user balance
      const user = await tx.user.update({
        where: { id: reservation.userId },
        data: { creditBalance: { decrement: reservation.amount } },
      });

      // Create audit transaction
      await tx.creditTransaction.create({
        data: {
          userId: reservation.userId,
          amount: -reservation.amount,
          reason: reservation.reason,
          referenceId: reservation.referenceId,
          balanceAfter: user.creditBalance,
        },
      });

      // Mark reservation as committed
      await tx.creditReservation.update({
        where: { id: reservationId },
        data: { status: 'committed', resolvedAt: new Date() },
      });

      this.logger.log(
        `Committed reservation ${reservationId}: deducted ${reservation.amount} credits`,
      );
    });
  }

  /**
   * Release a reservation (rollback). Called when the operation fails.
   * No balance change since credits were never actually deducted.
   */
  async release(reservationId: string): Promise<void> {
    const reservation = await this.prisma.creditReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      this.logger.warn(`Reservation ${reservationId} not found for release`);
      return;
    }

    if (reservation.status !== 'reserved') {
      this.logger.warn(
        `Reservation ${reservationId} already ${reservation.status}, skipping release`,
      );
      return;
    }

    await this.prisma.creditReservation.update({
      where: { id: reservationId },
      data: { status: 'released', resolvedAt: new Date() },
    });

    this.logger.log(`Released reservation ${reservationId}`);
  }

  /**
   * Get total reserved (uncommitted, non-expired) credits for a user.
   */
  async getReservedAmount(userId: string): Promise<number> {
    return this.sumActiveReservations(this.prisma, userId);
  }

  /**
   * Get available balance: actual balance minus active reservations.
   */
  async getAvailableBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    const reserved = await this.sumActiveReservations(this.prisma, userId);
    return user.creditBalance - reserved;
  }

  /**
   * Cleanup expired reservations. Returns count of cleaned up records.
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.creditReservation.updateMany({
      where: {
        status: 'reserved',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'released',
        resolvedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired reservations`);
    }

    return result.count;
  }

  private async sumActiveReservations(
    tx: Pick<PrismaService, 'creditReservation'>,
    userId: string,
  ): Promise<number> {
    const result = await tx.creditReservation.aggregate({
      where: {
        userId,
        status: 'reserved',
        expiresAt: { gt: new Date() },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }
}
