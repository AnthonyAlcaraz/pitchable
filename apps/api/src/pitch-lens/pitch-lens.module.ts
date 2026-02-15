import { Module, forwardRef } from '@nestjs/common';
import { PitchLensController } from './pitch-lens.controller.js';
import { PitchLensService } from './pitch-lens.service.js';
import { PitchLensAgentService } from './pitch-lens-agent.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { ThemesModule } from '../themes/themes.module.js';

@Module({
  imports: [PrismaModule, forwardRef(() => ChatModule), ThemesModule],
  controllers: [PitchLensController],
  providers: [PitchLensService, PitchLensAgentService],
  exports: [PitchLensService, PitchLensAgentService],
})
export class PitchLensModule {}
