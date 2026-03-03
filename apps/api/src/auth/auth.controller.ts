import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { HttpRequest } from '../types/express.js';
import type { HttpResponse } from '../types/express.js';
import { AuthService } from './auth.service.js';
import type { AuthResponse, AuthTokens } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { RequestUser } from './decorators/current-user.decorator.js';

interface RefreshRequest {
  user: { userId: string; refreshToken: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({
    short: { ttl: 60000, limit: 3 },     // 3 per minute
    medium: { ttl: 3600000, limit: 10 },  // 10 per hour
    long: { ttl: 86400000, limit: 20 },   // 20 per day
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: HttpRequest,
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
  @Throttle({
    short: { ttl: 60000, limit: 10 },     // 10 per minute
    medium: { ttl: 3600000, limit: 50 },   // 50 per hour
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: HttpRequest,
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
  @Throttle({
    short: { ttl: 60000, limit: 3 },       // 3 per minute
    medium: { ttl: 3600000, limit: 5 },     // 5 per hour
    long: { ttl: 86400000, limit: 10 },     // 10 per day
  })
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

  @Post('verify-email')
  @Throttle({
    short: { ttl: 60000, limit: 5 },
    medium: { ttl: 3600000, limit: 20 },
  })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @Throttle({
    short: { ttl: 60000, limit: 1 },
    medium: { ttl: 3600000, limit: 5 },
  })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser() user: RequestUser): Promise<{ message: string }> {
    return this.authService.resendVerification(user.userId);
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentUser() user: RequestUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    await this.authService.deleteAccount(user.userId, dto.password);
    return { message: 'Account deleted successfully' };
  }

  @Get('google')
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport redirects to Google — handler intentionally empty
  }

  @Get('google/callback')
  @SkipThrottle()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: HttpRequest,
    @Res() res: HttpResponse,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    try {
      const googleUser = req.user as {
        googleId: string;
        email: string;
        name: string;
      };

      const result = await this.authService.googleLogin(googleUser);

      const params = new URLSearchParams({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });

      res.redirect(`${frontendUrl}/oauth/callback?${params.toString()}`);
    } catch (error) {
      this.logger.error('Google OAuth callback failed', error);
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Get('providers')
  @SkipThrottle()
  getProviders(): { google: boolean } {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    return { google: !!clientId };
  }
}
