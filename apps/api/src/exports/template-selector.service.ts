import { Injectable } from '@nestjs/common';
import type { LayoutProfile } from './pptxgenjs-exporter.service.js';
import type { ExportFormat } from '../../generated/prisma/enums.js';

export type RenderEngine = 'pptxgenjs' | 'marp' | 'figma-renderer';

export interface RenderEngineSelection {
  engine: RenderEngine;
  layoutProfile: LayoutProfile;
  reason: string;
}

export interface TemplateSelectorContext {
  format: string;
  audienceType?: string;
  pitchGoal?: string;
  toneStyle?: string;
  companyStage?: string;
  deckArchetype?: string;
  themeName: string;
  themeCategory: string;
  defaultLayoutProfile: LayoutProfile;
  figmaTemplateId?: string | null;
}

@Injectable()
export class TemplateSelectorService {
  selectRenderEngine(ctx: TemplateSelectorContext): RenderEngineSelection {
    // 1. User-specified Figma template → figma-renderer
    if (ctx.figmaTemplateId) {
      return {
        engine: 'figma-renderer',
        layoutProfile: ctx.defaultLayoutProfile,
        reason: 'User has a linked Figma template',
      };
    }

    // 2. PDF format → Marp (HTML/CSS vector PDFs are superior)
    if (ctx.format === 'PDF') {
      return {
        engine: 'marp',
        layoutProfile: ctx.defaultLayoutProfile,
        reason: 'PDF export uses Marp for vector HTML/CSS rendering',
      };
    }

    // 3. PPTX format → PptxGenJS with layout profile
    if (ctx.format === 'PPTX') {
      const layoutProfile = this.resolveLayoutProfile(ctx);
      return {
        engine: 'pptxgenjs',
        layoutProfile,
        reason: this.buildReason(layoutProfile, ctx),
      };
    }

    // 4. All other formats (REVEAL_JS, FIGMA, etc.) → Marp fallback
    return {
      engine: 'marp',
      layoutProfile: ctx.defaultLayoutProfile,
      reason: `${ctx.format} format uses default renderer`,
    };
  }

  private resolveLayoutProfile(ctx: TemplateSelectorContext): LayoutProfile {
    // Start with theme default
    let profile = ctx.defaultLayoutProfile;

    // Override: consulting archetypes → consulting
    if (ctx.deckArchetype === 'STRATEGY_BRIEF' || ctx.deckArchetype === 'BOARD_UPDATE') {
      profile = 'consulting';
    }

    // Override: keynote/product launch → creative
    if (ctx.deckArchetype === 'KEYNOTE' || ctx.deckArchetype === 'PRODUCT_LAUNCH') {
      profile = 'creative';
    }

    // Override: technical deep dive → technical
    if (ctx.deckArchetype === 'TECHNICAL_DEEP_DIVE') {
      profile = 'technical';
    }

    // Override: formal tone + executive audience → corporate
    if (
      ctx.toneStyle === 'FORMAL' &&
      (ctx.audienceType === 'EXECUTIVES' || ctx.audienceType === 'BOARD')
    ) {
      profile = 'corporate';
    }

    return profile;
  }

  private buildReason(profile: LayoutProfile, ctx: TemplateSelectorContext): string {
    const parts: string[] = [];

    if (profile !== ctx.defaultLayoutProfile) {
      parts.push(`Overridden from theme default "${ctx.defaultLayoutProfile}"`);
    }

    switch (profile) {
      case 'consulting':
        parts.push('Clean McKinsey-style layouts with horizontal accents');
        break;
      case 'corporate':
        parts.push('Professional layout without visual effects');
        break;
      case 'creative':
        parts.push('Dramatic accents with strong glass card effects');
        break;
      case 'startup':
        parts.push('Glass cards and bokeh ambient lighting');
        break;
      case 'technical':
        parts.push('Subtle dot-grid background with clean typography');
        break;
    }

    if (ctx.deckArchetype) {
      parts.push(`Archetype: ${ctx.deckArchetype.toLowerCase().replace(/_/g, ' ')}`);
    }

    return parts.join('. ');
  }
}
