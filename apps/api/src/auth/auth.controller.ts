import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { UserDto, AuthResponse, AuthTokens } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { RequestUser } from './decorators/current-user.decorator.js';

interface AuthenticatedRequest {
  user: UserDto;
}

interface RefreshRequest {
  user: { userId: string; refreshToken: string };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: AuthenticatedRequest): Promise<AuthResponse> {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: RequestUser): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Request() req: RefreshRequest): Promise<AuthTokens> {
    return this.authService.refreshTokens(
      req.user.userId,
      req.user.refreshToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
