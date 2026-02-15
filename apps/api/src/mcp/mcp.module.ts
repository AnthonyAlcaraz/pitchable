import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { PresentationsModule } from '../presentations/presentations.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ApiV1Module } from '../api-v1/api-v1.module.js';
import { McpController } from './mcp.controller.js';
import { McpService } from './mcp.service.js';

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    PresentationsModule,
    CreditsModule,
    ApiV1Module,
  ],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
