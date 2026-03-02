import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailModule } from '../email/email.module.js';

// Only register GoogleStrategy when credentials are configured to avoid
// passport-oauth2 errors with invalid client IDs in production
const optionalProviders = process.env['GOOGLE_CLIENT_ID'] ? [GoogleStrategy] : [];

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: 900 },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenStrategy, ...optionalProviders],
  exports: [AuthService],
})
export class AuthModule {}
