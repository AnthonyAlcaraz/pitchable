import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: { get: (name: string) => string | undefined }, payload: { sub: string; email: string; role: string }) {
    const refreshToken = req.get('Authorization')?.replace('Bearer ', '').trim();
    return { userId: payload.sub, email: payload.email, role: payload.role, refreshToken };
  }
}
