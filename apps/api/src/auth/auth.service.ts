import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityService } from '../observability/activity.service.js';
import { EmailService } from '../email/email.service.js';
import { UserRole, UserTier } from '../../generated/prisma/enums.js';
import { FREE_SIGNUP_CREDITS } from '../credits/tier-config.js';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tier: UserTier;
  creditBalance: number;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: UserDto;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly activity: ActivityService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
    ip: string,
  ): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: UserRole.USER,
        tier: UserTier.FREE,
        creditBalance: FREE_SIGNUP_CREDITS,
        registrationIp: ip,
      },
    });

    this.activity.track({ userId: user.id, eventType: 'signup', category: 'auth', ip });

    // Log registration IP for abuse tracking
    await this.prisma.registrationIpLog.create({
      data: { ip, userId: user.id },
    });

    // Record signup credits as a transaction for audit trail
    if (FREE_SIGNUP_CREDITS > 0) {
      await this.prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: FREE_SIGNUP_CREDITS,
          reason: 'ADMIN_GRANT',
          balanceAfter: FREE_SIGNUP_CREDITS,
        },
      });
    }

    // Generate email verification token and send (fire-and-forget)
    const verificationToken = randomUUID();
    const tokenHash = await argon2.hash(verificationToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationSentAt: new Date(),
      },
    });

    // Fire-and-forget: don't block registration on email delivery
    void this.emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    const userDto = this.toUserDto(user);
    const tokens = await this.generateTokens(userDto.id, userDto.email, userDto.role);
    await this.updateRefreshTokenHash(userDto.id, tokens.refreshToken);

    return { tokens, user: userDto };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Google-only users cannot log in with a password
    if (!user.passwordHash) {
      return null;
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockout = attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          ...(lockout ? { lockedUntil: lockout } : {}),
        },
      });
      return null;
    }

    // Successful login — reset lockout counters
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.toUserDto(user);
  }

  async login(user: UserDto, ip?: string): Promise<AuthResponse> {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
        ...(ip ? { lastLoginIp: ip, lastLoginAt: new Date() } : {}),
      },
    });
    this.activity.track({ userId: user.id, eventType: 'login', category: 'auth', ip });

    return { tokens, user };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenMatches = await argon2.verify(
      user.refreshTokenHash,
      refreshToken,
    );

    if (!tokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    this.activity.track({ userId, eventType: 'logout', category: 'auth' });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // Don't reveal email existence

    const token = await (this.jwtService as any).signAsync(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    // Store hashed token for single-use verification
    const tokenHash = await argon2.hash(token);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetUsedAt: null },
    });

    // Fire-and-forget email send
    void this.emailService.sendPasswordResetEmail(user.email, user.name, token);
    this.logger.log(`Password reset email queued for ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        type: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Single-use check: verify token matches stored hash and hasn't been used
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { passwordResetToken: true, passwordResetUsedAt: true },
      });

      if (!user?.passwordResetToken) {
        throw new UnauthorizedException('No password reset was requested');
      }
      if (user.passwordResetUsedAt) {
        throw new UnauthorizedException('This reset link has already been used');
      }

      const tokenValid = await argon2.verify(user.passwordResetToken, token);
      if (!tokenValid) {
        throw new UnauthorizedException('Invalid reset token');
      }

      const passwordHash = await argon2.hash(newPassword);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: {
          passwordHash,
          refreshTokenHash: null,
          passwordResetUsedAt: new Date(),
        },
      });
      this.activity.track({ userId: payload.sub, eventType: 'password_reset', category: 'auth' });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find all users with a verification token set (not yet verified)
    const users = await this.prisma.user.findMany({
      where: { emailVerified: false, emailVerificationToken: { not: null } },
      select: { id: true, emailVerificationToken: true, email: true, name: true },
    });

    // Verify the token against each stored hash
    for (const user of users) {
      if (!user.emailVerificationToken) continue;
      const matches = await argon2.verify(user.emailVerificationToken, token);
      if (matches) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationSentAt: null,
          },
        });

        this.activity.track({ userId: user.id, eventType: 'email_verified', category: 'auth' });

        // Send welcome email after verification (fire-and-forget)
        void this.emailService.sendWelcomeEmail(user.email, user.name);

        return { message: 'Email verified successfully' };
      }
    }

    throw new UnauthorizedException('Invalid or expired verification token');
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true, emailVerificationSentAt: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Rate limit: 60 seconds between sends
    if (user.emailVerificationSentAt) {
      const elapsed = Date.now() - user.emailVerificationSentAt.getTime();
      if (elapsed < 60_000) {
        const seconds = Math.ceil((60_000 - elapsed) / 1000);
        throw new BadRequestException(`Please wait ${seconds} seconds before requesting another email`);
      }
    }

    const verificationToken = randomUUID();
    const tokenHash = await argon2.hash(verificationToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationSentAt: new Date(),
      },
    });

    // Fire-and-forget
    void this.emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    return { message: 'Verification email sent' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password login not available');
    }

    const isCurrentValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshTokenHash: null, // Invalidate all sessions
      },
    });

    this.activity.track({ userId, eventType: 'password_changed', category: 'auth' });
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password login not available');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Hard delete — Prisma cascade removes all related records
    await this.prisma.user.delete({ where: { id: userId } });

    this.logger.log(`Account deleted: ${user.email} (${userId})`);
  }

  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<AuthResponse> {
    const { googleId, email, name } = googleProfile;

    // 1. Try to find user by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // 2. Try to find by email
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
          // Different Google account already linked to this email
          throw new ConflictException(
            'This email is already linked to a different Google account',
          );
        }

        // Link Google account to existing local user
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            authProvider: existingByEmail.authProvider === 'local' && existingByEmail.passwordHash
              ? 'local' // Keep 'local' if they have a password (they can use both)
              : 'google',
          },
        });
      } else {
        // 3. Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            name,
            googleId,
            authProvider: 'google',
            passwordHash: null,
            role: UserRole.USER,
            tier: UserTier.FREE,
            creditBalance: FREE_SIGNUP_CREDITS,
          },
        });

        this.activity.track({
          userId: user.id,
          eventType: 'signup',
          category: 'auth',
          metadata: { provider: 'google' },
        });

        // Record signup credits
        if (FREE_SIGNUP_CREDITS > 0) {
          await this.prisma.creditTransaction.create({
            data: {
              userId: user.id,
              amount: FREE_SIGNUP_CREDITS,
              reason: 'ADMIN_GRANT',
              balanceAfter: FREE_SIGNUP_CREDITS,
            },
          });
        }
      }
    }

    if (!user) {
      throw new InternalServerErrorException('Failed to create or find user');
    }

    const userDto = this.toUserDto(user);
    const tokens = await this.generateTokens(userDto.id, userDto.email, userDto.role);
    await this.updateRefreshTokenHash(userDto.id, tokens.refreshToken);

    // Update login metadata
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.activity.track({
      userId: user.id,
      eventType: 'login',
      category: 'auth',
      metadata: { provider: 'google' },
    });

    return { tokens, user: userDto };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthTokens> {
    const payload: Record<string, unknown> = { sub: userId, email, role };

    const jwtSvc = this.jwtService as any;
    const [accessToken, refreshToken] = await Promise.all([
      jwtSvc.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 900, // 15 minutes
      }),
      jwtSvc.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: 604800, // 7 days
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  private toUserDto(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tier: UserTier;
    creditBalance: number;
    onboardingCompleted: boolean;
    emailVerified: boolean;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      creditBalance: user.creditBalance,
      onboardingCompleted: user.onboardingCompleted,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
