/**
 * Type guard validators for LLM JSON responses.
 * Passed to LlmService.completeJson() to trigger structural retry on malformed output.
 */

import type { GeneratedOutline, OutlineSlide } from './prompts/outline.prompt.js';
import type { ReviewResult } from './prompts/content-reviewer.prompt.js';

// ── Outline Validator ─────────────────────────────────────────

export function isValidOutline(data: unknown): data is GeneratedOutline {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false;
  if (!Array.isArray(obj['slides']) || obj['slides'].length === 0) return false;

  for (const slide of obj['slides']) {
    if (!slide || typeof slide !== 'object') return false;
    const s = slide as Record<string, unknown>;
    if (typeof s['slideNumber'] !== 'number') return false;
    if (typeof s['title'] !== 'string' || s['title'].length === 0) return false;
    if (!Array.isArray(s['bulletPoints'])) return false;
    // SECTION_DIVIDER and LOGO_WALL slides are intentionally minimal - allow empty bulletPoints
    const minimalTypes = ['SECTION_DIVIDER', 'LOGO_WALL'];
    if (!minimalTypes.includes(s['slideType'] as string) && s['bulletPoints'].length === 0) return false;
    if (typeof s['slideType'] !== 'string') return false;
  }

  return true;
}

// ── Single Outline Slide Validator ────────────────────────────

export function isValidOutlineSlide(data: unknown): data is OutlineSlide {
  if (!data || typeof data !== 'object') return false;
  const s = data as Record<string, unknown>;
  if (typeof s['title'] !== 'string' || s['title'].length === 0) return false;
  if (!Array.isArray(s['bulletPoints'])) return false;
  if (typeof s['slideType'] !== 'string') return false;
  return true;
}

// ── Slide Content Validator ───────────────────────────────────

export interface GeneratedSlideContent {
  title: string;
  body: string;
  speakerNotes: string;
  imagePromptHint: string;
}

export function isValidSlideContent(data: unknown): data is GeneratedSlideContent {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false;
  if (typeof obj['body'] !== 'string') return false;
  if (typeof obj['speakerNotes'] !== 'string') return false;
  if (typeof obj['imagePromptHint'] !== 'string') return false;

  return true;
}

// ── Modified Slide Content Validator ──────────────────────────

export interface ModifiedSlideContent {
  title: string;
  body: string;
  speakerNotes: string;
}

export function isValidModifiedSlideContent(data: unknown): data is ModifiedSlideContent {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj['title'] !== 'string' || obj['title'].length === 0) return false;
  if (typeof obj['body'] !== 'string') return false;
  if (typeof obj['speakerNotes'] !== 'string') return false;

  return true;
}

// ── Review Result Validator ───────────────────────────────────

export function isValidReviewResult(data: unknown): data is ReviewResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (obj['verdict'] !== 'PASS' && obj['verdict'] !== 'NEEDS_SPLIT') return false;
  if (typeof obj['score'] !== 'number' || obj['score'] < 0 || obj['score'] > 1) return false;
  if (!Array.isArray(obj['issues'])) return false;

  for (const issue of obj['issues']) {
    if (!issue || typeof issue !== 'object') return false;
    const i = issue as Record<string, unknown>;
    if (typeof i['rule'] !== 'string') return false;
    if (i['severity'] !== 'warning' && i['severity'] !== 'error') return false;
    if (typeof i['message'] !== 'string') return false;
  }

  return true;
}
