import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

    const passwordHash = await bcrypt.hash(password, 10);

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
    const accessToken = this.signToken(userDto);

    return { accessToken, user: userDto };
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return this.toUserDto(user);
  }

  async login(user: UserDto): Promise<AuthResponse> {
    const accessToken = this.signToken(user);
    return { accessToken, user };
  }

  private signToken(user: UserDto): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
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
