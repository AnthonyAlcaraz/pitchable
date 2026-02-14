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

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tier: UserTier;
  creditBalance: number;
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
        creditBalance: 0,
      },
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

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return null;
    }

    return this.toUserDto(user);
  }

  async login(user: UserDto): Promise<AuthResponse> {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
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

    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'password-reset' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

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

      const passwordHash = await argon2.hash(newPassword);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash, refreshTokenHash: null },
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

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 900, // 15 minutes
      }),
      this.jwtService.signAsync(payload, {
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
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      creditBalance: user.creditBalance,
      createdAt: user.createdAt,
    };
  }
}
