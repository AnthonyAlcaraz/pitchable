/**
 * Standalone test for RendererChooserService.
 *
 * Run: cd ~/projects/slide-saas/apps/api && npx tsx src/exports/renderer-chooser.test.ts
 *
 * Requires ANTHROPIC_API_KEY in env (uses Haiku — ~$0.01 per run).
 */
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../chat/llm.service.js';
import { RendererChooserService } from './renderer-chooser.service.js';
import type { SlideModel } from '../../generated/prisma/models/Slide.js';

// Minimal slide factory — only fields the chooser reads
function makeSlide(partial: {
  slideNumber: number;
  slideType: string;
  title: string;
  body: string;
}): SlideModel {
  return {
    id: `test-${partial.slideNumber}`,
    slideNumber: partial.slideNumber,
    slideType: partial.slideType,
    title: partial.title,
    body: partial.body,
    imageUrl: null,
    speakerNotes: null,
    sectionLabel: null,
    presentationId: 'test-pres',
    createdAt: new Date(),
    updatedAt: new Date(),
    imagePrompt: null,
    figmaSyncVersion: null,
  } as unknown as SlideModel;
}

const MOCK_SLIDES: SlideModel[] = [
  // Should be overridden → TIMELINE
  makeSlide({
    slideNumber: 1,
    slideType: 'CONTENT',
    title: 'Our Journey',
    body: '2020: Founded the company in a garage\n2021: Raised Series A ($5M)\n2022: Launched v1.0 to 10K users\n2023: Expanded to Europe\n2024: Hit $10M ARR',
  }),
  // Should be overridden → TEAM
  makeSlide({
    slideNumber: 2,
    slideType: 'CONTENT',
    title: 'Leadership Team',
    body: 'Alice Chen - CEO, ex-Google VP\nBob Martinez - CTO, 15 years in distributed systems\nCarol Kim - CFO, former Goldman Sachs\nDave Patel - VP Engineering, built Stripe\'s infra',
  }),
  // Should be overridden → METRICS_HIGHLIGHT
  makeSlide({
    slideNumber: 3,
    slideType: 'CONTENT',
    title: 'Key Results',
    body: '$4.2M ARR — 180% year-over-year growth\n12,500 active users — up from 3,200 last year\n99.97% uptime — enterprise-grade reliability\nNPS 72 — top quartile for B2B SaaS',
  }),
  // Should NOT be overridden — plain content
  makeSlide({
    slideNumber: 4,
    slideType: 'CONTENT',
    title: 'Why Now?',
    body: 'The market is shifting toward AI-native workflows. Legacy tools built for manual processes cannot keep up. Enterprises are actively seeking solutions that reduce operational overhead while maintaining compliance. Our platform addresses this gap with a unique combination of automation and governance.',
  }),
  // Already FIGMA_GRADE — should be skipped entirely
  makeSlide({
    slideNumber: 5,
    slideType: 'TIMELINE',
    title: 'Product Roadmap',
    body: 'Q1: Launch enterprise tier\nQ2: Add SSO and RBAC\nQ3: International expansion\nQ4: IPO preparation',
  }),
  // Should be overridden → COMPARISON
  makeSlide({
    slideNumber: 6,
    slideType: 'CONTENT',
    title: 'Before vs After',
    body: 'Before: Manual data entry takes 4 hours per report, error rate of 12%, team frustrated with repetitive work\nAfter: Automated pipeline generates reports in 5 minutes, error rate below 0.1%, team focused on analysis',
  }),
];

async function main() {
  console.log('=== Renderer Chooser Test ===\n');

  // Bootstrap services manually (no NestJS DI in standalone test)
  const configService = new ConfigService({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });
  const llm = new LlmService(configService);
  const chooser = new RendererChooserService(llm);

  console.log(`Testing with ${MOCK_SLIDES.length} slides (1 already FIGMA_GRADE)...\n`);

  const overrides = await chooser.chooseRenderers(MOCK_SLIDES);

  console.log(`\nResults: ${overrides.size} override(s)\n`);

  // Validate expectations
  const expectations: Array<{ slideNumber: number; expected: string | null; label: string }> = [
    { slideNumber: 1, expected: 'TIMELINE', label: 'Timeline content → TIMELINE' },
    { slideNumber: 2, expected: 'TEAM', label: 'Team content → TEAM' },
    { slideNumber: 3, expected: 'METRICS_HIGHLIGHT', label: 'Metrics content → METRICS_HIGHLIGHT' },
    { slideNumber: 4, expected: null, label: 'Plain content → no override' },
    { slideNumber: 5, expected: null, label: 'Already FIGMA_GRADE → skipped' },
    { slideNumber: 6, expected: 'COMPARISON', label: 'Before/After → COMPARISON' },
  ];

  let passed = 0;
  let failed = 0;

  for (const exp of expectations) {
    const actual = overrides.get(exp.slideNumber) ?? null;
    const ok = actual === exp.expected;
    const icon = ok ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] Slide ${exp.slideNumber}: ${exp.label}`);
    console.log(`         Expected: ${exp.expected ?? '(none)'}, Got: ${actual ?? '(none)'}`);
    if (ok) passed++; else failed++;
  }

  console.log(`\n${passed}/${expectations.length} passed, ${failed} failed`);

  // Also dump full override map
  if (overrides.size > 0) {
    console.log('\nFull override map:');
    for (const [num, tmpl] of overrides) {
      console.log(`  slide ${num} → ${tmpl}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
