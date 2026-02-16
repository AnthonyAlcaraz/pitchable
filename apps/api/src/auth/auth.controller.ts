import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
  Request,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthResponse, AuthTokens } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { IpRegistrationGuard } from './guards/ip-registration.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { RequestUser } from './decorators/current-user.decorator.js';

interface RefreshRequest {
  user: { userId: string; refreshToken: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Post('register')
  @Throttle({
    short: { ttl: 60000, limit: 3 },     // 3 per minute
    medium: { ttl: 3600000, limit: 10 },  // 10 per hour
    long: { ttl: 86400000, limit: 20 },   // 20 per day
  })
  @UseGuards(IpRegistrationGuard)
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthResponse> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
      ip,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthResponse> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? undefined;
    return this.authService.login(user, ip);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: RequestUser): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Request() req: RefreshRequest): Promise<AuthTokens> {
    return this.authService.refreshTokens(
      req.user.userId,
      req.user.refreshToken,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists with that email, a reset link has been sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('complete-onboarding')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @CurrentUser() user: RequestUser,
  ): Promise<{ id: string; onboardingCompleted: boolean }> {
    return this.prisma.user.update({
      where: { id: user.userId },
      data: { onboardingCompleted: true },
      select: { id: true, onboardingCompleted: true },
    });
  }
}
