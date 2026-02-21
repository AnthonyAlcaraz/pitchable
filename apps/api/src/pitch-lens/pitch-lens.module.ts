import { Module } from '@nestjs/common';
import { PitchLensController } from './pitch-lens.controller.js';
import { PitchLensService } from './pitch-lens.service.js';
import { ArchetypeResolverService } from './archetypes/archetype-resolver.service.js';
import { TemplateSelectorService } from '../exports/template-selector.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ThemesModule } from '../themes/themes.module.js';
import { CreditsModule } from '../credits/credits.module.js';

@Module({
  imports: [PrismaModule, ThemesModule, CreditsModule],
  controllers: [PitchLensController],
  providers: [PitchLensService, ArchetypeResolverService, TemplateSelectorService],
  exports: [PitchLensService, ArchetypeResolverService],
})
export class PitchLensModule {}
