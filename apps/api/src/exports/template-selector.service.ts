import { Injectable } from '@nestjs/common';
import type { LayoutProfile } from './marp-exporter.service.js';

export type RenderEngine = 'marp';

export interface RenderEngineSelection {
  engine: RenderEngine;
  layoutProfile: LayoutProfile;
  reason: string;
}

interface SelectionContext {
  format: string;
  themeName: string;
  themeCategory: string;
  defaultLayoutProfile: LayoutProfile;
  figmaTemplateId?: string | null;
  audienceType?: string | null;
  pitchGoal?: string | null;
  toneStyle?: string | null;
  deckArchetype?: string | null;
}

// Archetype → layout profile override mapping
const ARCHETYPE_PROFILE_MAP: Record<string, LayoutProfile> = {
  STRATEGY_BRIEF: 'consulting',
  BOARD_UPDATE: 'consulting',
  INVESTOR_UPDATE: 'consulting',
  KEYNOTE: 'creative',
  PRODUCT_LAUNCH: 'creative',
  TECHNICAL_DEEP_DIVE: 'technical',
};

@Injectable()
export class TemplateSelectorService {
  selectRenderEngine(ctx: SelectionContext): RenderEngineSelection {
    const layoutProfile = this.resolveLayoutProfile(ctx);

    // Rule 1: Figma template linked — Marp with Figma backgrounds
    if (ctx.figmaTemplateId) {
      return {
        engine: 'marp',
        layoutProfile,
        reason: 'Figma template linked — Marp with Figma backgrounds',
      };
    }

    // Rule 2: All other cases → Marp (default, zero-config)
    const reason = this.buildReason(ctx, layoutProfile);

    return {
      engine: 'marp',
      layoutProfile,
      reason,
    };
  }

  private resolveLayoutProfile(ctx: SelectionContext): LayoutProfile {
    // Start with theme's default
    let profile = ctx.defaultLayoutProfile;

    // Override based on deck archetype (strongest signal)
    if (ctx.deckArchetype && ARCHETYPE_PROFILE_MAP[ctx.deckArchetype]) {
      profile = ARCHETYPE_PROFILE_MAP[ctx.deckArchetype];
    }

    // Override: formal tone + executives → corporate
    if (ctx.toneStyle === 'FORMAL' && ctx.audienceType === 'EXECUTIVES') {
      profile = 'corporate';
    }

    // Override: consulting category themes always get consulting profile
    if (ctx.themeCategory === 'consulting') {
      profile = 'consulting';
    }

    return profile;
  }

  private buildReason(ctx: SelectionContext, profile: LayoutProfile): string {
    const parts: string[] = [`Layout profile: ${profile}`];

    if (ctx.deckArchetype && ARCHETYPE_PROFILE_MAP[ctx.deckArchetype]) {
      parts.push(`archetype ${ctx.deckArchetype} → ${profile} style`);
    } else if (ctx.themeCategory === 'consulting') {
      parts.push(`consulting theme → clean serif layout`);
    } else {
      parts.push(`theme default (${ctx.themeName})`);
    }

    return parts.join(' — ');
  }
}
