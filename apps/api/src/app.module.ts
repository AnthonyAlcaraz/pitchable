import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ThemesModule } from './themes/themes.module.js';
import { CreditsModule } from './credits/credits.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { PresentationsModule } from './presentations/presentations.module.js';
import { ImagesModule } from './images/images.module.js';
import { ConstraintsModule } from './constraints/constraints.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      },
    }),
    PrismaModule,
    AuthModule,
    ConstraintsModule,
    ThemesModule,
    CreditsModule,
    PresentationsModule,
    ImagesModule,
    ExportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
