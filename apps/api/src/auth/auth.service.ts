import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
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
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

    // Log registration IP for abuse tracking
    await this.prisma.registrationIpLog.create({
      data: { ip, userId: user.id },
    });

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

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (this.configService.get<string>('NODE_ENV') === 'production') {
      // TODO: Send email via Resend in production
      console.log(`[PRODUCTION] Password reset email would be sent to ${email}`);
    } else {
      console.log(`[DEV] Password reset URL: ${resetUrl}`);
    }
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
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
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
      createdAt: user.createdAt,
    };
  }
}
