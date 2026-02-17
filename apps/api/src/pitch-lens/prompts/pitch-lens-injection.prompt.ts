import type { PitchLens } from '../../../generated/prisma/client.js';
import type { StoryFrameworkConfig } from '../frameworks/story-frameworks.config.js';

export interface PitchLensWithFramework extends PitchLens {
  framework?: StoryFrameworkConfig;
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  FORMAL:
    'Professional and polished. Use complete sentences, industry-standard terminology, third-person perspective. Avoid colloquialisms.',
  CONVERSATIONAL:
    'Warm and approachable. Use "you" and "we" freely. Short sentences. Contractions allowed. Like explaining to a smart friend.',
  BOLD:
    'Confident and assertive. Short punchy statements. Strong verbs. No hedging ("might", "could", "perhaps"). Make declarative claims backed by data.',
  INSPIRATIONAL:
    'Visionary and forward-looking. Paint vivid pictures of the future. Use aspirational language. Appeal to shared values and purpose.',
  ANALYTICAL:
    'Data-driven and precise. Lead with numbers. Use comparisons and benchmarks. Quantify everything possible. Let data tell the story.',
  STORYTELLING:
    'Narrative-driven. Open with anecdotes. Use characters, conflict, and resolution. Make abstract concepts concrete through examples.',
};

const TECHNICAL_DEPTH: Record<string, string> = {
  NON_TECHNICAL:
    'Zero jargon. Explain everything in plain language. Use analogies and metaphors. Focus on outcomes and benefits, not mechanisms.',
  SEMI_TECHNICAL:
    'Light technical concepts are fine. Explain acronyms on first use. Focus on "what it does" more than "how it works".',
  TECHNICAL:
    'Technical language welcome. Include architecture details, metrics, and implementation specifics. The audience understands the domain.',
  HIGHLY_TECHNICAL:
    'Deep technical content expected. Include code-level details, system diagrams, performance benchmarks, and technical trade-offs.',
};

/**
 * Build a prompt injection block from a Pitch Lens.
 * This block gets appended to system prompts for outline generation,
 * slide content generation, and chat context.
 */
export function buildPitchLensInjection(
  lens: PitchLensWithFramework,
): string {
  const parts: string[] = [];

  parts.push(`\n## Pitch Lens: "${lens.name}"`);
  parts.push('');
  parts.push(
    `AUDIENCE: ${formatEnum(lens.audienceType)}`,
  );
  parts.push(`GOAL: ${formatEnum(lens.pitchGoal)}`);
  parts.push(`INDUSTRY: ${lens.industry}`);
  parts.push(
    `COMPANY STAGE: ${formatEnum(lens.companyStage)}`,
  );
  parts.push(`TONE: ${formatEnum(lens.toneStyle)}`);
  parts.push(
    `TECHNICAL LEVEL: ${formatEnum(lens.technicalLevel)}`,
  );

  // Tone guidance
  const toneDesc = TONE_DESCRIPTIONS[lens.toneStyle];
  if (toneDesc) {
    parts.push('');
    parts.push(`### Tone Guidance`);
    parts.push(toneDesc);
  }

  // Technical depth guidance
  const techDesc = TECHNICAL_DEPTH[lens.technicalLevel];
  if (techDesc) {
    parts.push('');
    parts.push(`### Technical Depth`);
    parts.push(techDesc);
  }

  // Framework guidance
  if (lens.framework) {
    parts.push('');
    parts.push(
      `### Storytelling Framework: ${lens.framework.name}`,
    );
    parts.push(lens.framework.shortDescription);
    parts.push('');
    parts.push(lens.framework.detailedGuidance);

    // Slide structure
    parts.push('');
    parts.push('### MANDATORY Slide Structure (follow this section order — each section needs at least 1 slide):');
    lens.framework.slideStructure.forEach((step, i) => {
      parts.push(`${i + 1}. ${step}`);
    });
  }

  // Custom guidance
  if (lens.customGuidance) {
    parts.push('');
    parts.push('### Custom Guidance');
    parts.push(lens.customGuidance);
  }

  // Outline slide enforcement
  if ((lens as unknown as Record<string, unknown>).showOutlineSlide) {
    parts.push('');
    parts.push('### Outline / Agenda Slide (MANDATORY)');
    parts.push(
      'Slide 2 MUST be an OUTLINE slide. Title it "Agenda" or "What We\'ll Cover". The body must be a numbered list of the key topics from the remaining slides (excluding the TITLE and CTA slides). Keep each item to 3-6 words. This gives the audience a roadmap of the presentation.',
    );
  }

  // Section labels enforcement
  if ((lens as unknown as Record<string, unknown>).showSectionLabels) {
    parts.push('');
    parts.push('### Section Labels (MANDATORY)');
    parts.push(
      'Every slide MUST have a sectionLabel field. This is a 1-3 word ALL-CAPS tag displayed in the top-left corner of each slide (e.g., "VISION", "EVIDENCE", "THE ASK", "TEAM", "COMPETITIVE LANDSCAPE", "ARCHITECTURE", "PATH", "BUSINESS MODEL").',
    );
    parts.push(
      'Section labels group slides into narrative chapters. Adjacent slides CAN share the same label. Use specific, descriptive labels. Do NOT leave sectionLabel empty or omit it.',
    );
  }

  parts.push('');
  parts.push(
    'IMPORTANT: All content must be calibrated for this Pitch Lens. Tone, depth, jargon level, narrative structure, and slide ordering must match the settings above.',
  );

  return parts.join('\n');
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
