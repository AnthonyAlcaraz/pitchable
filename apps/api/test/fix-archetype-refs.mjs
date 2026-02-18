/**
 * Fix archetype-resolver references that don't compile.
 * The archetype-resolver.service.ts was never created, so we remove all references.
 */
import { readFileSync, writeFileSync } from 'fs';

function fix(filePath, replacements) {
  let content = readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    if (!content.includes(search)) {
      console.log(`  WARN: Pattern not found in ${filePath}: "${search.slice(0, 60)}..."`);
      continue;
    }
    content = content.replace(search, replace);
    console.log(`  Fixed: "${search.slice(0, 60)}..." → "${replace.slice(0, 40)}..."`);
  }
  writeFileSync(filePath, content, 'utf8');
  console.log(`  Saved ${filePath}`);
}

const API_SRC = 'src';

// ── Fix sync-generation.service.ts ──
console.log('\n=== sync-generation.service.ts ===');
fix(`${API_SRC}/api-v1/sync-generation.service.ts`, [
  // 1. Remove ArchetypeResolverService import (no longer exists)
  // Already not in the current file based on re-read — the import was already cleaned up
  // But the constructor might still reference it and the code uses it

  // 2. Remove archetypeResolver from constructor if present
  [`    private readonly qualityAgents: QualityAgentsService,
    private readonly archetypeResolver: ArchetypeResolverService,`,
   `    private readonly qualityAgents: QualityAgentsService,`],

  // 3. Remove archetype context block
  [`      // 5b. Build archetype context (if PitchLens has deckArchetype)
      let syncArchetypeContext: string | undefined;
      if (pitchLens?.deckArchetype) {
        syncArchetypeContext = this.archetypeResolver.buildArchetypeInjection(
          pitchLens.deckArchetype as DeckArchetype,
        );
        // Override slide range from archetype if not already overridden by framework
        const archetypeConfig = this.archetypeResolver.getArchetype(
          pitchLens.deckArchetype as DeckArchetype,
        );
        if (archetypeConfig) {
          range.min = archetypeConfig.slideRange.min;
          range.max = archetypeConfig.slideRange.max;
        }
      }

      // 6.`, `      // 6.`],

  // 4. Remove syncArchetypeContext from buildOutlineSystemPrompt
  [`      const outlineSystemPrompt = buildOutlineSystemPrompt(
        presType,
        range,
        kbContext,
        pitchLensContext,
        syncArchetypeContext,
      );`,
   `      const outlineSystemPrompt = buildOutlineSystemPrompt(
        presType,
        range,
        kbContext,
        pitchLensContext,
      );`],

  // 5. Remove syncArchetypeContext from buildSlideGenerationSystemPrompt
  [`        const slideSystemPrompt = buildSlideGenerationSystemPrompt(
          presType,
          themeName,
          kbContext,
          pitchLensContext,
          undefined,
          syncImgFreq,
          syncDensityOverrides,
          syncImageLayoutInstruction,
          syncArchetypeContext,
        );`,
   `        const slideSystemPrompt = buildSlideGenerationSystemPrompt(
          presType,
          themeName,
          kbContext,
          pitchLensContext,
          undefined,
          syncImgFreq,
          syncDensityOverrides,
          syncImageLayoutInstruction,
        );`],

  // 6. Remove archetypeId from quality review options
  [`          frameworkName: pitchLens?.selectedFramework ?? undefined,
          archetypeId: pitchLens?.deckArchetype ?? undefined,
          userId,`,
   `          frameworkName: pitchLens?.selectedFramework ?? undefined,
          userId,`],
]);

// ── Fix generation.service.ts ──
console.log('\n=== generation.service.ts ===');
fix(`${API_SRC}/chat/generation.service.ts`, [
  // 1. Remove archetypeId from quality review options (executeOutline path)
  [`        frameworkName: presWithLens?.pitchLens?.selectedFramework ?? undefined,
        archetypeId: presWithLens?.pitchLens?.deckArchetype ?? undefined,
        userId,`,
   `        frameworkName: presWithLens?.pitchLens?.selectedFramework ?? undefined,
        userId,`],

  // 2. Remove archetype context block in rewriteSlides
  [`    // Build archetype context (rewrite path)
    let rewriteArchetypeContext: string | undefined;
    if (presentation.pitchLens?.deckArchetype) {
      rewriteArchetypeContext = this.archetypeResolver.buildArchetypeInjection(
        presentation.pitchLens.deckArchetype as DeckArchetype,
      );
    }

    // Extract`, `    // Extract`],

  // 3. Remove rewriteArchetypeContext from buildSlideGenerationSystemPrompt in rewrite
  [`      rewriteDensity,
      rewriteImageLayout,
      rewriteArchetypeContext,
    ) + feedbackBlock;`,
   `      rewriteDensity,
      rewriteImageLayout,
    ) + feedbackBlock;`],
]);

// ── Fix quality-agents.service.ts (add archetypeId to options if it's referenced) ──
// Actually, quality-agents.service.ts is the one RECEIVING the options —
// the callers pass archetypeId but the type doesn't have it.
// Since we removed archetypeId from callers, this is now clean.

console.log('\nDone! Run `npx tsc --noEmit` to verify.');
