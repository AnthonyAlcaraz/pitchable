/**
 * Figma-grade HTML+SVG slide templates for complex slide types.
 *
 * These 6 types produce superior visuals via absolute-positioned HTML+SVG
 * compared to Marp CSS alone. Marp CLI --html renders them natively via
 * its internal Puppeteer/Chromium.
 *
 * Coordinate system: 1280x720 (Marp default slide size).
 * Figma source: 960x720 — X coords scaled by 1.333, Y coords unchanged.
 */

import type { ColorPalette } from './slide-visual-theme.js';

// SlideModel shape (only fields we use)
interface SlideInput {
  title: string;
  body: string;
  slideType: string;
  imageUrl?: string;
}

// ── Constants ────────────────────────────────────────────────

const PAD = 53;       // 40 * (1280/960)
const W = 1280;
const H = 720;

// Slide types that use Figma-grade HTML+SVG templates for superior visuals.
export const FIGMA_GRADE_TYPES: Set<string> = new Set([
  'COMPARISON', 'TIMELINE', 'METRICS_HIGHLIGHT', 'DATA_METRICS', 'MARKET_SIZING', 'TEAM',
  'FEATURE_GRID', 'PROCESS', 'PROBLEM', 'SOLUTION', 'CTA', 'CONTENT', 'QUOTE', 'ARCHITECTURE',
]);

// ── Helpers ──────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,3}\s+/, '');
}

function parseBodyLines(body: string): string[] {
  return body
    .split('\n')
    .filter((l) => !/^\s*\|[-:\s|]+\|\s*$/.test(l))  // Remove table separator rows (|---|---|)
    .map((l) => {
      // Strip table row pipes: "| Metric | Value |" -> "Metric  Value"
      let cleaned = l;
      if (/^\s*\|/.test(cleaned)) {
        cleaned = cleaned.replace(/^\s*\|/, '').replace(/\|\s*$/, '').replace(/\|/g, ' — ').trim();
      }
      // Strip HTML tags, bullet markers, arrow prefixes, markdown formatting
      cleaned = cleaned.replace(/^[-•*→►▸➜]\s*/, '').replace(/<[^>]*>/g, '').trim();
      return stripMarkdown(cleaned);
    })
    .filter(Boolean)
    .filter((l) => !/^---+$/.test(l))
    .filter((l) => !/^sources?:/i.test(l.trim()))
    .filter((l) => !/^#{1,3}\s/.test(l))
    .slice(0, 8);
}


function titleFontSize(title: string, maxFontSize = 32): number {
  if (title.length <= 30) return maxFontSize;
  if (title.length <= 50) return 28;
  if (title.length <= 70) return 24;
  if (title.length <= 90) return 20;
  return 18;
}

function splitProseToItems(lines: string[], minItems: number): string[] {
  if (lines.length >= minItems) return lines;
  const expanded: string[] = [];
  for (const line of lines) {
    if (line.length > 80) {
      const sentences = line.split(/(?<=\.)\s+/).filter(Boolean);
      expanded.push(...sentences);
    } else {
      expanded.push(line);
    }
  }
  return expanded.length >= minItems ? expanded : lines;
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function colorLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

// Subtle radial gradient overlay — adds depth and polish to slide backgrounds
function bgGradientOverlay(w: number, h: number, color: string, alpha = 0.05, posY = '35%'): string {
  return `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:radial-gradient(ellipse 80% 70% at 50% ${posY},${hexToRgba(color, alpha)} 0%,transparent 70%);pointer-events:none"></div>`;
}


// Glass card with backdrop blur — for dark theme frosted glass effects
function glassCard(w: number, h: number, x: number, y: number, bg: string, blur = 12): string {
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
    `background:${bg};backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);` +
    `border:1px solid rgba(255,255,255,0.15);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12)">`;
}

// Subtle text glow for dark themes — lifts titles off backgrounds
function textGlow(color: string, intensity = 0.3): string {
  return `text-shadow:0 0 20px ${hexToRgba(color, intensity)},0 0 40px ${hexToRgba(color, intensity * 0.5)}`;
}

// Diagonal accent stripe overlay for card headers
function accentStripe(w: number, h: number, color: string, alpha = 0.08): string {
  return `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;` +
    `background:linear-gradient(135deg,${hexToRgba(color, alpha)} 0%,transparent 50%);pointer-events:none"></div>`;
}

// 3-tier shadow depth system — replaces uniform box-shadow
function cardShadow(level: 1 | 2 | 3, dark: boolean): string {
  if (dark) {
    const shadows = [
      '0 2px 8px rgba(0,0,0,0.3)',
      '0 8px 24px rgba(0,0,0,0.25),0 2px 8px rgba(0,0,0,0.2)',
      '0 16px 48px rgba(0,0,0,0.3),0 4px 12px rgba(0,0,0,0.2)',
    ];
    return shadows[level - 1];
  }
  const shadows = [
    '0 1px 3px rgba(0,0,0,0.08)',
    '0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04)',
    '0 12px 40px rgba(0,0,0,0.1),0 4px 12px rgba(0,0,0,0.06)',
  ];
  return shadows[level - 1];
}

// Per-card accent color rotation — uses palette diversity for visual variety
function cardAccentColors(p: ColorPalette): string[] {
  return [p.accent, p.primary, p.secondary, p.success, p.warning, p.error].filter(Boolean);
}

// Extract numeric count from title ("Four Decisions..." → 4, "3 Key Steps" → 3)
// Returns undefined if no count detected — caller decides whether to cap.
function titleCountCap(title: string): number | undefined {
  const wordMap: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const lower = title.toLowerCase();
  for (const [word, num] of Object.entries(wordMap)) {
    if (lower.includes(word)) return num;
  }
  const digitMatch = title.match(/\b(\d+)\b/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (n >= 2 && n <= 8) return n;
  }
  return undefined;
}

// Deterministic variant selector: produces consistent 0-based index from content.
// Same slide content always gets the same variant, but different slides vary.
function layoutVariant(title: string, body: string, maxVariants: number): number {
  let h = 0;
  const s = title + body.slice(0, 100);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % maxVariants;
}


// ── Content Mood Detection ──────────────────────────────────
// Lightweight keyword detection on title+body → mood category → decorative CSS overlays.
// All treatments use existing palette colors at low opacity (0.03-0.08).

export type ContentMood = 'GROWTH' | 'RISK' | 'TECH' | 'PEOPLE' | 'STRATEGY' | 'NEUTRAL';

const MOOD_KEYWORDS: { mood: ContentMood; re: RegExp }[] = [
  { mood: 'GROWTH', re: /\b(grow(?:th|ing)?|scal(?:e|ing|able)|expand|increas(?:e|ing)|revenue|profit|market|opportunit|accelerat|momentum|traction|adoption|compound|multipl|gain(?:s|ed|ing)?|rais(?:e|ing))\b/gi },
  { mood: 'RISK', re: /\b(risk|threat|challeng|declin(?:e|ing)|loss|crisis|vulnerabilit|bottleneck|gap(?:s)?|debt|churn|friction|obstacle|barrier|failur|problem|pain|waste)\b/gi },
  { mood: 'TECH', re: /\b(AI|ML|algorithm|platform|architecture|API|cloud|data|neural|automat(?:ion|ed)|digital|infrastructure|stack|framework|pipeline|integrat(?:ion|ed)|system|model|deploy)\b/gi },
  { mood: 'PEOPLE', re: /\b(team|culture|people|talent|hir(?:e|ing)|leadership|collaborat|communit|diversit|employee|mentor|customer|user|experience|engagement)\b/gi },
  { mood: 'STRATEGY', re: /\b(strateg|vision|roadmap|future|transform|mission|pivot|initiativ|north\s*star|alignment|objectiv|milestone|goal|plan(?:s|ning)?|next)\b/gi },
];

export function detectContentMood(title: string, body: string): ContentMood {
  const text = (title + ' ' + body.slice(0, 500)).toLowerCase();
  let best: ContentMood = 'NEUTRAL';
  let bestCount = 0;
  for (const { mood, re } of MOOD_KEYWORDS) {
    re.lastIndex = 0;
    const matches = text.match(re);
    const count = matches ? matches.length : 0;
    if (count >= 1 && count > bestCount) {
      best = mood;
      bestCount = count;
    }
  }
  return best;
}

function moodOverlay(mood: ContentMood, p: ColorPalette, cW: number, isDark: boolean): string {
  if (mood === 'NEUTRAL') return '';
  const colors: Record<ContentMood, string> = {
    GROWTH: p.success || p.primary,
    RISK: p.error || p.primary,
    TECH: p.primary,
    PEOPLE: p.warning || p.primary,
    STRATEGY: p.accent,
    NEUTRAL: '',
  };
  const c = colors[mood];
  switch (mood) {
    case 'GROWTH':
      return `<div style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;background:linear-gradient(to top right,${hexToRgba(c, 0.06)} 0%,transparent 60%);pointer-events:none;z-index:0"></div>` +
        `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none;z-index:0" viewBox="0 0 ${cW} ${H}">` +
        `<line x1="${cW * 0.1}" y1="${H * 0.9}" x2="${cW * 0.3}" y2="${H * 0.4}" stroke="${hexToRgba(c, 0.04)}" stroke-width="2"/>` +
        `<line x1="${cW * 0.35}" y1="${H * 0.85}" x2="${cW * 0.55}" y2="${H * 0.35}" stroke="${hexToRgba(c, 0.05)}" stroke-width="1.5"/>` +
        `<line x1="${cW * 0.6}" y1="${H * 0.8}" x2="${cW * 0.8}" y2="${H * 0.3}" stroke="${hexToRgba(c, 0.06)}" stroke-width="1"/>` +
        `</svg>`;
    case 'RISK':
      return `<div style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;clip-path:polygon(0 0,100% 0,100% 70%,0 100%);background:${hexToRgba(c, 0.04)};pointer-events:none;z-index:0"></div>` +
        `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none;z-index:0" viewBox="0 0 ${cW} ${H}">` +
        `<line x1="0" y1="${H * 0.3}" x2="${cW}" y2="${H * 0.7}" stroke="${hexToRgba(c, 0.03)}" stroke-width="1.5"/>` +
        `<line x1="0" y1="${H * 0.5}" x2="${cW}" y2="${H * 0.9}" stroke="${hexToRgba(c, 0.05)}" stroke-width="1"/>` +
        `</svg>`;
    case 'TECH': {
      const dotColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
      return `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none;z-index:0" viewBox="0 0 ${cW} ${H}">` +
        `<defs><pattern id="mood-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">` +
        `<circle cx="20" cy="20" r="1" fill="${dotColor}"/></pattern></defs>` +
        `<rect width="${cW}" height="${H}" fill="url(#mood-dots)"/>` +
        `<path d="M${PAD},${PAD} L${PAD + 20},${PAD} M${PAD},${PAD} L${PAD},${PAD + 20}" stroke="${hexToRgba(c, 0.08)}" stroke-width="2" fill="none"/>` +
        `<path d="M${cW - PAD},${H - PAD} L${cW - PAD - 20},${H - PAD} M${cW - PAD},${H - PAD} L${cW - PAD},${H - PAD - 20}" stroke="${hexToRgba(c, 0.08)}" stroke-width="2" fill="none"/>` +
        `</svg>`;
    }
    case 'PEOPLE':
      return `<div style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;background:radial-gradient(70% 60% at 70% 65%,${hexToRgba(c, 0.05)} 0%,transparent 70%);pointer-events:none;z-index:0"></div>` +
        `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none;z-index:0" viewBox="0 0 ${cW} ${H}">` +
        `<path d="M${cW * 0.1},${H * 0.8} Q${cW * 0.4},${H * 0.2} ${cW * 0.9},${H * 0.6}" stroke="${hexToRgba(c, 0.06)}" stroke-width="2" fill="none"/>` +
        `</svg>`;
    case 'STRATEGY':
      return `<div style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;background:linear-gradient(to right,${hexToRgba(c, 0.05)} 0%,transparent 50%);pointer-events:none;z-index:0"></div>` +
        `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none;z-index:0" viewBox="0 0 ${cW} ${H}">` +
        `<line x1="${cW * 0.1}" y1="${H * 0.5}" x2="${cW * 0.85}" y2="${H * 0.5}" stroke="${hexToRgba(c, 0.07)}" stroke-width="1.5"/>` +
        `<polyline points="${cW * 0.82},${H * 0.45} ${cW * 0.88},${H * 0.5} ${cW * 0.82},${H * 0.55}" stroke="${hexToRgba(c, 0.07)}" stroke-width="1.5" fill="none"/>` +
        `</svg>`;
    default:
      return '';
  }
}

function moodAccentBar(mood: ContentMood, color: string, width: number, left: number, top: number): string {
  const base = `position:absolute;left:${left}px;top:${top}px`;
  switch (mood) {
    case 'GROWTH':
      return `<div style="${base};width:${width}px;height:3px;background:${color};border-radius:2px;transform:rotate(-2deg)"></div>`;
    case 'RISK':
      return `<div style="${base};width:${width}px;height:2px;background:${color};border-radius:2px"></div>` +
        `<div style="position:absolute;left:${left + Math.round(width * 0.15)}px;top:${top + 5}px;width:${Math.round(width * 0.7)}px;height:2px;background:${color};border-radius:2px;opacity:0.5"></div>`;
    case 'TECH':
      return `<div style="${base};width:${width}px;height:3px;border-radius:2px;background:repeating-linear-gradient(to right,${color} 0px,${color} 8px,transparent 8px,transparent 14px)"></div>`;
    case 'PEOPLE':
      return `<div style="${base};width:${Math.round(width * 1.2)}px;height:4px;background:${color};border-radius:6px"></div>`;
    case 'STRATEGY':
      return `<div style="${base};width:${width}px;height:3px;background:${color};clip-path:polygon(0 0,92% 0,100% 50%,92% 100%,0 100%);border-radius:2px"></div>`;
    default:
      return `<div style="${base};width:${width}px;height:3px;background:${color};border-radius:2px"></div>`;
  }
}

function moodCardTint(mood: ContentMood, p: ColorPalette): string {
  const colors: Record<ContentMood, string> = {
    GROWTH: p.success || p.primary,
    RISK: p.error || p.primary,
    TECH: p.primary,
    PEOPLE: p.warning || p.primary,
    STRATEGY: p.accent,
    NEUTRAL: 'transparent',
  };
  if (mood === 'NEUTRAL') return 'transparent';
  return hexToRgba(colors[mood], 0.02);
}

export interface MoodTextColors {
  titleColor: string;
  emphasisColor: string;
  metricColor: string;
}

export function moodTextColors(mood: ContentMood, p: ColorPalette, dark: boolean): MoodTextColors {
  if (mood === 'NEUTRAL') {
    return { titleColor: p.text, emphasisColor: p.accent, metricColor: p.primary };
  }

  const moodColorMap: Record<Exclude<ContentMood, 'NEUTRAL'>, string> = {
    GROWTH: p.success || p.primary,
    RISK: p.error || p.primary,
    TECH: p.primary,
    PEOPLE: p.warning || p.primary,
    STRATEGY: p.accent,
  };
  const mc = moodColorMap[mood as Exclude<ContentMood, 'NEUTRAL'>];

  // Contrast safety: if mood color is too close to background, fall back to defaults
  const bgLum = colorLuminance(p.background);
  const mcLum = colorLuminance(mc);
  const safe = Math.abs(bgLum - mcLum) >= 40;

  return {
    titleColor: safe ? mc : p.text,
    emphasisColor: safe ? mc : p.accent,
    metricColor: safe ? mc : p.primary,
  };
}

// ── Scoped reset injected into every Figma-grade slide ──────

const SCOPED_RESET = `<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; }
</style>`;

// ── Image overlay for Figma-grade slides ─────────────────────
// Renders the slide image as an absolute-positioned element on the right
// side of the slide, with a gradient fade into the content area.
// This replaces the old Marp ![bg right:30%] approach which conflicted
// with absolute-positioned HTML templates.

const IMG_WIDTH_RATIO = 0.30;  // 30% of slide width for image
const CONTENT_W_IMG = Math.round(W * 0.68);  // Available content width when image present (30% image + 2% gap)

function buildImageOverlay(imageUrl: string, palette: ColorPalette): string {
  const imgX = Math.round(W * (1 - IMG_WIDTH_RATIO));
  const imgW = Math.round(W * IMG_WIDTH_RATIO);
  return `<div style="position:absolute;right:0;top:0;width:${imgW}px;height:${H}px;z-index:1;overflow:hidden">` +
    `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;opacity:0.85" />` +
    `<div style="position:absolute;left:0;top:0;width:60px;height:100%;background:linear-gradient(to right,${palette.background},transparent)"></div>` +
    `</div>`;
}

// ── Public API ───────────────────────────────────────────────

export function buildHtmlSlideContent(
  slide: SlideInput,
  palette: ColorPalette,
): string {
  // Strip markdown from title at entry point; body is passed raw so
  // builders like parseMarkdownTable() can detect **bold** markers.
  const cleaned: SlideInput = {
    ...slide,
    title: stripMarkdown(slide.title),
    body: slide.body,
  };

  let html = '';
  switch (cleaned.slideType) {
    case 'MARKET_SIZING':
      html = buildMarketSizing(cleaned, palette, !!cleaned.imageUrl); break;
    case 'TIMELINE':
      html = buildTimeline(cleaned, palette, !!cleaned.imageUrl); break;
    case 'METRICS_HIGHLIGHT':
    case 'DATA_METRICS':
      html = buildMetricsHighlight(cleaned, palette, !!cleaned.imageUrl); break;
    case 'COMPARISON':
      html = buildComparison(cleaned, palette, !!cleaned.imageUrl); break;
    case 'TEAM':
      html = buildTeam(cleaned, palette, !!cleaned.imageUrl); break;
    case 'FEATURE_GRID':
      html = buildFeatureGrid(cleaned, palette, !!cleaned.imageUrl); break;
    case 'PROCESS':
      html = buildProcess(cleaned, palette, !!cleaned.imageUrl); break;
    case 'PROBLEM':
      html = buildProblem(cleaned, palette, !!cleaned.imageUrl); break;
    case 'SOLUTION':
      html = buildSolution(cleaned, palette, !!cleaned.imageUrl); break;
    case 'CTA':
      html = buildCta(cleaned, palette, !!cleaned.imageUrl); break;
    case 'CONTENT':
      html = buildContent(cleaned, palette, !!cleaned.imageUrl); break;
    case 'QUOTE':
      html = buildQuote(cleaned, palette, !!cleaned.imageUrl); break;
    case 'ARCHITECTURE':
      html = buildArchitecture(cleaned, palette, !!cleaned.imageUrl); break;
    default:
      return '';
  }

  // Text stacking prevention: ensure body text divs have overflow:hidden
  html = html.replace(
    /opacity:0\.8[5-9](?!.*overflow:hidden)/g,
    (match) => match + ';overflow:hidden',
  );

  // ── Mood detection + visual adaptation ──
  const mood = detectContentMood(cleaned.title, cleaned.body);
  const cW = cleaned.imageUrl ? CONTENT_W_IMG : W;
  const dark = isDarkBackground(palette.background);

  if (mood !== 'NEUTRAL' && html) {
    // Inject mood overlay after bgGradientOverlay div
    const bgMarker = 'pointer-events:none"></div>';
    const bgIdx = html.indexOf(bgMarker);
    if (bgIdx > -1) {
      const insertAt = bgIdx + bgMarker.length;
      html = html.slice(0, insertAt) + '\n  ' + moodOverlay(mood, palette, cW, dark) + html.slice(insertAt);
    } else {
      // Fallback: insert after wrapper div opening tag
      const wrapOpen = html.indexOf('>');
      if (wrapOpen > -1) {
        html = html.slice(0, wrapOpen + 1) + '\n  ' + moodOverlay(mood, palette, cW, dark) + html.slice(wrapOpen + 1);
      }
    }

    // Replace first accent bar with mood-specific version
    const barRe = /<div style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;height:3px;background:([^;]+);border-radius:2px"><\/div>/;
    const barMatch = html.match(barRe);
    if (barMatch) {
      const left = parseInt(barMatch[1], 10);
      const top = parseInt(barMatch[2], 10);
      const width = parseInt(barMatch[3], 10);
      const color = barMatch[4];
      html = html.replace(barMatch[0], moodAccentBar(mood, color, width, left, top));
    }

    // ── Mood-based visual unification ──
    // Replace ALL rotating card accent colors with single mood color.
    // This unifies borders, icons, badges, text, and card tops — making
    // each slide's mood immediately obvious (green=growth, red=risk, etc.)
    const mColors = moodTextColors(mood, palette, dark);
    const moodColor = mColors.titleColor; // primary mood color

    // Title: replace p.text on bold titles with mood color
    if (mColors.titleColor !== palette.text) {
      html = html.replaceAll(
        `font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${palette.text}`,
        `font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${mColors.titleColor}`,
      );
    }

    // Unify ALL card accent colors to mood color
    // Covers: border-left, border-top, icon backgrounds, badge colors,
    // bold keyword text, card title colors, number badges
    const accentSet = cardAccentColors(palette);
    for (const ac of accentSet) {
      if (ac === moodColor) continue; // skip if already the mood color
      // Solid color in style attributes (;color:X, solid X, background:X)
      html = html.replaceAll(`;color:${ac}`, `;color:${moodColor}`);
      html = html.replaceAll(` solid ${ac}`, ` solid ${moodColor}`);
      html = html.replaceAll(`background:${ac}`, `background:${moodColor}`);
      // RGBA variants used in borders, badge backgrounds, card tints
      for (const alpha of [0.7, 0.6, 0.5, 0.3, 0.15, 0.1, 0.08, 0.04, 0.02]) {
        const oldRgba = hexToRgba(ac, alpha);
        const newRgba = hexToRgba(moodColor, alpha);
        if (oldRgba !== newRgba) {
          html = html.replaceAll(oldRgba, newRgba);
        }
      }
    }

    // Metrics: replace p.primary on large bold text (28px+)
    if (mColors.metricColor !== palette.primary) {
      html = html.replace(
        new RegExp(`font-weight:bold;color:${palette.primary.replace('#', '\\#')}`, 'g'),
        () => `font-weight:bold;color:${mColors.metricColor}`,
      );
    }
  }

  // ── Systematic visibility enforcement ──
  // Final pass: any inline text color too close to background gets swapped to palette.text.
  // This prevents invisible text regardless of mood, theme, or palette combination.
  {
    const bgLum = colorLuminance(palette.background);
    html = html.replace(
      /(?<=;|")color:(#[0-9a-fA-F]{6})/g,
      (match, hex) => {
        if (Math.abs(bgLum - colorLuminance(hex)) < 30) {
          return `color:${palette.text}`;
        }
        return match;
      },
    );
  }

  // Inject image overlay if the slide has an image
  if (cleaned.imageUrl && html) {
    // Insert the image overlay just before the closing </div> of the wrapper
    const closingIdx = html.lastIndexOf('</div>');
    if (closingIdx > -1) {
      html = html.slice(0, closingIdx) + buildImageOverlay(cleaned.imageUrl, palette) + html.slice(closingIdx);
    }
  }

  return html;
}

// ── MARKET_SIZING ────────────────────────────────────────────
// Concentric TAM/SAM/SOM circles (right) + text column (left)

function buildMarketSizing(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const lines = parseBodyLines(slide.body);
  const cW = hasImage ? CONTENT_W_IMG : W;
  const cx = hasImage ? Math.round(cW * 0.65) : Math.round(W * 0.72);  // shift circles left when image
  const cy = Math.round(H * 0.5);   // 360

  const circles = [
    { r: 210, label: 'TAM', opacity: 0.08 },
    { r: 140, label: 'SAM', opacity: 0.12 },
    { r: 80,  label: 'SOM', opacity: 0.2 },
  ];

  const labelOffsets = [
    { label: 'TAM', dy: -190 },
    { label: 'SAM', dy: -110 },
    { label: 'SOM', dy: -6 },
  ];

  let bodyHtml = '';
  let ty = PAD + 80;
  for (const line of lines) {
    bodyHtml += `<div style="position:absolute;left:${PAD}px;top:${ty}px;width:${Math.round(cW * 0.4)}px;font-size:22px;line-height:1.4;opacity:0.85;color:${p.text}">${escHtml(line)}</div>`;
    ty += 48;
  }

  const circlesSvg = circles.map((c) =>
    `<circle cx="${cx}" cy="${cy}" r="${c.r}" fill="${p.primary}" opacity="${c.opacity}" />`
  ).join('');

  const labelsSvg = labelOffsets.map((l) =>
    `<text x="${cx}" y="${cy + l.dy}" text-anchor="middle" fill="${p.primary}" font-size="14" font-weight="bold" letter-spacing="2">${l.label}</text>`
  ).join('');

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${Math.round(cW * 0.45)}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${bodyHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${circlesSvg}
    ${labelsSvg}
  </svg>
</div>`;
}

// ── TIMELINE ─────────────────────────────────────────────────
// Horizontal connector line + circle nodes at computed positions

function buildTimeline(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const rawLines = parseBodyLines(slide.body);
  const expanded = splitProseToItems(rawLines, 3)
    .map((l) => l.trim().replace(/^[→►▸➜]\s*/, ''))
    .filter((l) => l.trim().length >= 10);
  const tlCap = titleCountCap(slide.title);
  const milestones = expanded.slice(0, tlCap ? Math.min(tlCap, 5) : 5).map((line, i) => {
    const sep = line.indexOf(':');
    if (sep > -1 && sep < 40) return { date: line.slice(0, sep).trim(), text: line.slice(sep + 1).trim() };
    if (rawLines.length < 3) return { date: 'Phase ' + (i + 1), text: line };
    return { date: '', text: line };
  });

  if (milestones.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = milestones.length;
  const tlVariant = layoutVariant(slide.title, slide.body, 2);

  // Variant 1: Staggered zigzag — milestones alternate above/below center line
  if (tlVariant === 1 && count >= 3) {
    const dark = isDarkBackground(p.background);
    const zigLineY = Math.round(H * 0.48);
    const zigStartX = PAD + 60;
    const zigEndX = (hasImage ? Math.round(W * 0.7) : W) - PAD - 60;
    const zigSpacing = (zigEndX - zigStartX) / (count - 1 || 1);
    const zigCardW = Math.min(200, Math.round(zigSpacing - 16));
    const zigCardH = 130;
    const zigAccents = cardAccentColors(p);
    let zigHtml = '';
    let zigSvg = '';

    // Central horizontal line
    zigSvg += `<line x1="${zigStartX}" y1="${zigLineY}" x2="${zigEndX}" y2="${zigLineY}" stroke="${p.border}" stroke-width="2" opacity="0.4" />`;

    for (let i = 0; i < count; i++) {
      const cx = count === 1 ? Math.round(cW / 2) : Math.round(zigStartX + i * zigSpacing);
      const fill = zigAccents[i % zigAccents.length];
      const above = i % 2 === 0;
      const cardTop = above ? zigLineY - zigCardH - 24 : zigLineY + 24;
      const connY1 = above ? zigLineY - 24 : zigLineY;
      const connY2 = above ? zigLineY : zigLineY + 24;

      // Connector line from center to card
      zigSvg += `<line x1="${cx}" y1="${connY1}" x2="${cx}" y2="${connY2}" stroke="${fill}" stroke-width="2" opacity="0.5" />`;
      // Node circle on center line
      zigSvg += `<circle cx="${cx}" cy="${zigLineY}" r="8" fill="${fill}" />`;
      zigSvg += `<circle cx="${cx}" cy="${zigLineY}" r="12" fill="${hexToRgba(fill, 0.15)}" />`;

      // Card
      const cardBg = dark ? hexToRgba(p.surface, 0.6) : p.surface;
      const cardBorder = dark
        ? `backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12)`
        : `border:1px solid ${p.border}`;
      zigHtml += `<div style="position:absolute;left:${cx - zigCardW / 2}px;top:${cardTop}px;width:${zigCardW}px;height:${zigCardH}px;background:${cardBg};${cardBorder};border-radius:12px;box-shadow:${cardShadow(2, dark)};overflow:hidden"></div>`;
      // Colored top/bottom edge
      if (above) {
        zigHtml += `<div style="position:absolute;left:${cx - zigCardW / 2}px;top:${cardTop + zigCardH - 3}px;width:${zigCardW}px;height:3px;background:${fill};border-radius:0 0 12px 12px"></div>`;
      } else {
        zigHtml += `<div style="position:absolute;left:${cx - zigCardW / 2}px;top:${cardTop}px;width:${zigCardW}px;height:3px;background:${fill};border-radius:12px 12px 0 0"></div>`;
      }
      // Date label
      if (milestones[i].date) {
        zigHtml += `<div style="position:absolute;left:${cx - zigCardW / 2 + 10}px;top:${cardTop + (above ? 10 : 12)}px;width:${zigCardW - 20}px;font-size:11px;font-weight:bold;color:${fill};letter-spacing:0.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(milestones[i].date)}</div>`;
      }
      // Text content
      const textTop = cardTop + (milestones[i].date ? 28 : 12);
      zigHtml += `<div style="position:absolute;left:${cx - zigCardW / 2 + 10}px;top:${textTop}px;width:${zigCardW - 20}px;max-height:${zigCardH - (milestones[i].date ? 40 : 24)}px;font-size:12px;line-height:1.4;color:${p.text};overflow:hidden"><span style="font-weight:600;color:${fill}">${escHtml(milestones[i].text.split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(milestones[i].text.split(/\s+/).slice(2).join(" "))}</div>`;
    }

    const titleGlowCss = dark ? `;${textGlow(p.accent, 0.25)}` : '';
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlowCss}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${zigSvg}
  </svg>
  ${zigHtml}
</div>`;
  }

  const visibleW = hasImage ? Math.round(W * 0.7) : W;
  const lineY = Math.round(H * 0.42);
  const lineStartX = PAD + 40;
  const lineEndX = visibleW - PAD - 40;
  const spacing = (lineEndX - lineStartX) / (count - 1 || 1);
  const nodeR = 10;

  // Card dimensions — fill available space
  const cardW = Math.min(220, Math.round((lineEndX - lineStartX) / count - 8));
  const cardH = Math.round(H - lineY - 40 - PAD);
  const dateFontSz = count <= 3 ? 13 : 11;
  const textFontSz = count <= 3 ? 14 : 12;

  const tlAccents = cardAccentColors(p);
  let nodesSvg = '';
  let labelHtml = '';

  for (let i = 0; i < count; i++) {
    const cx = count === 1 ? Math.round(cW / 2) : Math.round(lineStartX + i * spacing);
    const fill = tlAccents[i % tlAccents.length];

    // Outer ring + filled center
    nodesSvg += `<circle cx="${cx}" cy="${lineY}" r="${nodeR + 4}" fill="${hexToRgba(fill, 0.15)}" />`;
    nodesSvg += `<circle cx="${cx}" cy="${lineY}" r="${nodeR}" fill="${fill}" />`;

    // Date label ABOVE the line
    if (milestones[i].date) {
      labelHtml += `<div style="position:absolute;left:${cx - cardW / 2}px;top:${lineY - 36}px;width:${cardW}px;text-align:center;font-size:${dateFontSz}px;font-weight:bold;color:${fill};letter-spacing:0.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(milestones[i].date)}</div>`;
    }

    // Description card BELOW the line — contained with max-height and overflow hidden
    const cardTop = lineY + 22;
    labelHtml += `<div style="position:absolute;left:${cx - cardW / 2}px;top:${cardTop}px;width:${cardW}px;height:${cardH}px;background:${hexToRgba(p.surface, 0.5)};border:1px solid ${hexToRgba(p.border, 0.3)};border-radius:10px;border-top:3px solid ${fill};overflow:hidden"></div>`;
    labelHtml += `<div style="position:absolute;left:${cx - cardW / 2 + 10}px;top:${cardTop + 10}px;width:${cardW - 20}px;max-height:${cardH - 20}px;text-align:center;font-size:${textFontSz}px;line-height:1.4;color:${p.text};overflow:hidden"><span style="font-weight:600;color:${fill}">${escHtml(milestones[i].text.split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(milestones[i].text.split(/\s+/).slice(2).join(" "))}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${lineStartX}" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" stroke="${p.border}" stroke-width="2" />
    ${nodesSvg}
  </svg>
  ${labelHtml}
</div>`;
}

// ── METRICS_HIGHLIGHT ────────────────────────────────────────
// Big hero number + radial glow + secondary metrics row

function buildMetricsHighlight(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const lines = parseBodyLines(slide.body);

  const cW = hasImage ? CONTENT_W_IMG : W;

  // Try to extract a big number from the first line (e.g. "$4.2B" or "98%")
  let bigValue = slide.title;
  let bigLabel = '';
  let supportLines: string[] = lines;

  // Check if first line looks like a metric value (starts with $, digit, or ends with %)
  if (lines.length > 0 && /^[\d$€£¥]|%$/.test(lines[0].trim())) {
    bigValue = lines[0].trim();
    if (lines.length > 1) {
      bigLabel = lines[1].trim();
      supportLines = lines.slice(2);
    } else {
      supportLines = [];
    }
  } else if (lines.length > 0) {
    // Secondary extraction: find prominent numbers/percentages WITHIN prose text
    for (let li = 0; li < lines.length; li++) {
      const inlineMatch = lines[li].match(/(\$?[\d,]+\.?\d*[BMKTbmkt]?\+?%?)\s+(.*)/);
      if (inlineMatch && inlineMatch[1].length >= 2) {
        bigValue = inlineMatch[1];
        bigLabel = inlineMatch[2] || lines[li];
        supportLines = [...lines.slice(0, li), ...lines.slice(li + 1)];
        break;
      }
      // Also try: "Over 90% reduction" or "Up to 250,000 hours"
      const embeddedMatch = lines[li].match(/(?:over|up to|nearly|about|approximately)?\s*(\$?[\d,]+\.?\d*[BMKTbmkt]?\+?%?)/i);
      if (embeddedMatch && embeddedMatch[1].length >= 2 && /\d/.test(embeddedMatch[1])) {
        bigValue = embeddedMatch[1];
        bigLabel = lines[li].replace(embeddedMatch[0], '').trim() || lines[li];
        supportLines = [...lines.slice(0, li), ...lines.slice(li + 1)];
        break;
      }
    }
  }

  // Auto-scale hero font: short metrics get 80px, long titles scale down
  const heroFontSize = bigValue.length <= 10 ? 80
    : bigValue.length <= 25 ? 56
    : bigValue.length <= 50 ? 38
    : 28;
  const heroY = Math.round(H * (heroFontSize >= 56 ? 0.22 : 0.14));
  const supportText = supportLines.join(' ');

  // Secondary metrics: look for lines with "value: label" or "value - label" pattern
  let secondaryHtml = '';
  const metricLines = supportLines.filter((l) => /^[\d$€£¥]/.test(l.trim()) || /%/.test(l));
  const nonMetricLines = supportLines.filter((l) => !metricLines.includes(l));

  if (metricLines.length >= 2) {
    const secY = Math.round(H * 0.72);
    const cols = Math.min(metricLines.length, 3);
    const colW = Math.round((cW - PAD * 2 - 200) / cols);
    for (let i = 0; i < cols; i++) {
      const cx = PAD + 100 + i * colW;
      const parts = metricLines[i].split(/[:\-–—]/);
      const val = parts[0].trim();
      const label = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
      secondaryHtml += `<div style="position:absolute;left:${cx}px;top:${secY}px;width:${colW}px;text-align:center">
        <div style="font-size:28px;font-weight:bold;color:${p.primary}">${escHtml(val)}</div>
        ${label ? `<div style="font-size:13px;color:${p.text};opacity:0.65;margin-top:4px">${escHtml(label)}</div>` : ''}
        <div style="width:${Math.round(colW * 0.6)}px;height:4px;background:${hexToRgba(p.border, 0.3)};border-radius:2px;margin:8px auto 0"><div style="width:60%;height:100%;background:${p.accent};border-radius:2px;opacity:0.7"></div></div>
      </div>`;
    }
  }

  const displaySupport = nonMetricLines.length > 0 ? nonMetricLines.join(' ') : (metricLines.length < 2 ? supportText : '');

  // Center reference: use content width (accounts for image overlay)
  const centerX = Math.round(cW / 2);

  // Progress ring for percentage values — only when text is short enough to sit inside
  const pctMatch = bigValue.match(/^(\d+(?:\.\d+)?)\s*%$/);
  const pctValue = pctMatch && heroFontSize >= 56 ? Math.min(parseFloat(pctMatch[1]), 100) : null;

  // Hero text center point (ring and decorations center here)
  const textCenterY = heroY + Math.round(heroFontSize / 2);

  let circleSvg = '';
  // Ring bottom edge determines where label text starts
  let contentBottomY = heroY + heroFontSize + 4; // default: just below hero text

  if (pctValue !== null) {
    // Progress ring: centered on the hero text so number sits inside
    const ringR = 100;
    const ringStroke = 7;
    const ringPad = ringStroke + 2;
    const svgSize = (ringR + ringPad) * 2;
    const svgCx = ringR + ringPad;
    const svgCy = svgCx;
    const circumference = Math.round(2 * Math.PI * ringR);
    const dashOffset = Math.round(circumference * (1 - pctValue / 100));
    const svgLeft = centerX - svgCx;
    const svgTop = textCenterY - svgCy;

    circleSvg = `<svg style="position:absolute;left:${svgLeft}px;top:${svgTop}px" width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${svgCx}" cy="${svgCy}" r="${ringR}" fill="${hexToRgba(p.accent, 0.03)}" stroke="${hexToRgba(p.border, 0.12)}" stroke-width="${ringStroke}" />
      <circle cx="${svgCx}" cy="${svgCy}" r="${ringR}" fill="none" stroke="${p.accent}" stroke-width="${ringStroke}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${svgCx} ${svgCy})" opacity="0.65" />
    </svg>`;
    contentBottomY = textCenterY + ringR + ringPad + 12;
  } else {
    // Decorative concentric circles for non-percentage metrics
    const decR = Math.round(Math.min(heroFontSize * 1.1, 100));
    const svgLeft = centerX - decR;
    const svgTop = textCenterY - Math.round(decR * 0.6);

    circleSvg = `<svg style="position:absolute;left:${svgLeft}px;top:${svgTop}px" width="${decR * 2}" height="${decR * 2}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${decR}" cy="${decR}" r="${Math.round(decR * 0.95)}" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.12" />
      <circle cx="${decR}" cy="${decR}" r="${Math.round(decR * 0.75)}" fill="none" stroke="${p.primary}" stroke-width="1.5" opacity="0.08" />
      <circle cx="${decR}" cy="${decR}" r="${Math.round(decR * 0.5)}" fill="${hexToRgba(p.accent, 0.03)}" stroke="none" />
    </svg>`;
  }

  // Dynamic vertical layout: all content flows below the ring/hero zone
  const showLabel = !!(bigLabel || bigValue !== slide.title);
  const labelText = bigLabel || slide.title;
  const labelW = cW - PAD * 2 - 120;
  const labelCharsPerLine = Math.max(1, Math.floor(labelW / 13));
  const labelLines = showLabel ? Math.min(3, Math.max(1, Math.ceil(labelText.length / labelCharsPerLine))) : 0;
  const labelFontSize = labelLines > 2 ? 20 : 24;
  const labelLineH = Math.round(labelFontSize * 1.3);
  const labelH = labelLines * labelLineH + 4;
  const labelY = contentBottomY + 4;
  const accentY = showLabel ? labelY + labelH + 6 : contentBottomY + 12;
  const supportY = accentY + 18;

  // Clamp: ensure support text doesn't collide with secondary metrics
  const maxSupportH = Math.round(Math.max(0, (metricLines.length >= 2 ? H * 0.72 : H - PAD * 2) - supportY - 20));

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;background:radial-gradient(ellipse 800px 600px at ${Math.round(cW / 2)}px 40%,${hexToRgba(p.primary, 0.06)} 0%,transparent 70%)"></div>
  ${circleSvg}
  <div style="position:absolute;left:${PAD}px;top:${heroY}px;width:${cW - PAD * 2}px;text-align:center;font-size:${heroFontSize}px;font-weight:bold;color:${p.primary};line-height:1.1;z-index:2${isDarkBackground(p.background) ? `;${textGlow(p.primary, 0.4)}` : ''}">${escHtml(bigValue)}</div>
  ${showLabel ? `<div style="position:absolute;left:${PAD + 60}px;top:${labelY}px;width:${labelW}px;text-align:center;font-size:${labelFontSize}px;font-weight:bold;color:${p.text};line-height:1.3;overflow:hidden;max-height:${labelH}px">${escHtml(labelText)}</div>` : ''}
  <div style="position:absolute;left:${Math.round((cW - 80) / 2)}px;top:${accentY}px;width:80px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${displaySupport && maxSupportH > 30 ? `<div style="position:absolute;left:${PAD + 60}px;top:${supportY}px;width:${cW - PAD * 2 - 120}px;text-align:center;font-size:16px;line-height:1.5;color:${p.text};opacity:0.75;overflow:hidden;max-height:${maxSupportH}px">${escHtml(displaySupport)}</div>` : ''}
  ${secondaryHtml}
</div>`;
}

// ── Table parser for McKinsey-style comparison tables ────────

interface ParsedTable {
  headers: string[];
  rows: string[][];
  leadText: string;
  takeaway: string;
  source: string;
}

function parseMarkdownTable(body: string): ParsedTable | null {
  const lines = body.split('\n');
  const tableStartIdx = lines.findIndex((l) => /^\s*\|.+\|/.test(l));
  if (tableStartIdx === -1) {
    // Fallback: detect em-dash separated tables (e.g., "Element — Annotation — Behavior")
    // These arise when pipe tables get converted by parseBodyLines
    const dashLines = lines.filter(l => (l.match(/ — /g) || []).length >= 2);
    if (dashLines.length >= 3) {
      const dashHeaders = dashLines[0].split(' — ').map(h => h.trim());
      const dashRows = dashLines.slice(1).map(l => l.split(' — ').map(c => c.trim()));
      const leadLines = lines.slice(0, lines.indexOf(dashLines[0])).filter(l => l.trim() && !/^#{1,3}\s/.test(l));
      return {
        headers: dashHeaders,
        rows: dashRows,
        leadText: leadLines.map(l => l.replace(/^[-\u2022*]\s*/, '').trim()).join(' ').trim(),
        takeaway: '',
        source: '',
      };
    }
    return null;
  }

  // Lead text = non-empty lines before the table (skip heading markers)
  const leadText = lines
    .slice(0, tableStartIdx)
    .filter((l) => l.trim() && !/^#{1,3}\s/.test(l))
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .join(' ')
    .trim();

  // Collect table rows (skip separator rows like |---|---|)
  const tableLines = lines.slice(tableStartIdx).filter(
    (l) => /^\s*\|.+\|/.test(l) && !/^\s*\|[-:\s|]+\|\s*$/.test(l),
  );
  if (tableLines.length < 2) return null; // need header + at least 1 data row

  const parseCells = (line: string): string[] =>
    line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = parseCells(tableLines[0]);
  const rows = tableLines.slice(1).map(parseCells);

  // Extract takeaway (### heading after table) and source
  const afterTable = lines.slice(tableStartIdx);
  let takeaway = '';
  let source = '';
  for (const l of afterTable) {
    if (/^#{1,3}\s/.test(l)) takeaway = l.replace(/^#{1,3}\s+/, '').trim();
    else if (/^sources?:/i.test(l.trim())) source = l.trim();
  }

  return { headers, rows, leadText, takeaway, source };
}

function isDarkBackground(bg: string): boolean {
  const c = bg.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ── COMPARISON ───────────────────────────────────────────────
// McKinsey table for pipe-delimited data, multi-card for 3+ items, two cards + VS badge for 2 items

/**
 * Detect 3+ comparison groups in body lines.
 * Returns null if fewer than 3 groups found — falls through to 2-card VS layout.
 */
function detectComparisonGroups(lines: string[]): { title: string; items: string[] }[] | null {
  if (lines.length < 3) return null;

  // Method 1: Multiple "vs" / "vs." separators
  const vsIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^vs\.?$/i.test(lines[i].trim())) vsIndices.push(i);
  }
  if (vsIndices.length >= 2) {
    const grps: { title: string; items: string[] }[] = [];
    let start = 0;
    for (const vi of vsIndices) {
      const chunk = lines.slice(start, vi);
      if (chunk.length > 0) grps.push({ title: chunk[0], items: chunk.slice(1) });
      start = vi + 1;
    }
    const last = lines.slice(start);
    if (last.length > 0) grps.push({ title: last[0], items: last.slice(1) });
    if (grps.length >= 3) return grps.slice(0, 4);
  }

  // Method 2: Short header lines (< 35 chars, capitalized) alternating with content
  const grps2: { title: string; items: string[] }[] = [];
  let cur: { title: string; items: string[] } | null = null;
  for (const line of lines) {
    const isHdr = line.length <= 35 && /^[A-Z]/.test(line) && !/[,;]/.test(line);
    if (isHdr && (cur === null || cur.items.length > 0)) {
      if (cur) grps2.push(cur);
      cur = { title: line, items: [] };
    } else if (cur) {
      cur.items.push(line);
    } else {
      cur = { title: line.slice(0, 25), items: [line] };
    }
  }
  if (cur) grps2.push(cur);
  if (grps2.length >= 3 && grps2.every(g => g.title.length >= 2)) return grps2.slice(0, 4);

  // Method 3: 3-5 lines of similar length — each line is its own comparison item
  if (lines.length >= 3 && lines.length <= 5) {
    const avgLen = lines.reduce((s, l) => s + l.length, 0) / lines.length;
    const allSimilar = lines.every(l => l.length > avgLen * 0.3 && l.length < avgLen * 2.5);
    if (allSimilar) {
      return lines.slice(0, 4).map(l => {
        const nameMatch = l.match(/^([A-Z][\w]+(?:\s+[A-Z]?[\w]+)?)/);
        const title = nameMatch ? nameMatch[1] : l.slice(0, 25);
        const rest = nameMatch ? l.slice(nameMatch[0].length).replace(/^\s*[-\u2014:,]\s*/, '') : '';
        return { title, items: rest ? [rest] : [l] };
      });
    }
  }

  return null;
}

function buildComparisonMultiCard(
  slide: SlideInput, p: ColorPalette,
  groups: { title: string; items: string[] }[],
  hasImage: boolean,
): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const count = Math.min(groups.length, 4);
  const gap = 16;
  const cardW = Math.round((cW - PAD * 2 - (count - 1) * gap) / count);
  const cardY = PAD + 80;
  const cardH = H - cardY - PAD;
  const accents = cardAccentColors(p);

  let cards = '';
  for (let i = 0; i < count; i++) {
    const g = groups[i];
    const x = PAD + i * (cardW + gap);
    const color = accents[i % accents.length];

    // Card background with colored top border
    cards += '<div style="position:absolute;left:' + x + 'px;top:' + cardY + 'px;width:' + cardW + 'px;height:' + cardH + 'px;background:' + p.surface + ';border:1px solid ' + p.border + ';border-top:3px solid ' + color + ';border-radius:12px;overflow:hidden"></div>';
    // Card header strip
    cards += '<div style="position:absolute;left:' + x + 'px;top:' + cardY + 'px;width:' + cardW + 'px;height:46px;background:' + hexToRgba(color, 0.12) + ';border-radius:12px 12px 0 0"></div>';
    // Card title
    cards += '<div style="position:absolute;left:' + (x + 16) + 'px;top:' + (cardY + 12) + 'px;width:' + (cardW - 32) + 'px;font-size:15px;font-weight:bold;color:' + color + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(stripMarkdown(g.title)) + '</div>';

    // Card items
    let itemY = cardY + 56;
    const maxItemH = Math.max(28, Math.min(40, Math.round((cardH - 56 - 12) / Math.max(g.items.length, 1))));
    const fontSize = cardW < 280 ? 13 : 15;
    const maxVisible = Math.floor((cardH - 56 - 12) / maxItemH);
    for (const item of g.items.slice(0, maxVisible)) {
      cards += '<div style="position:absolute;left:' + (x + 16) + 'px;top:' + itemY + 'px;width:' + (cardW - 32) + 'px;font-size:' + fontSize + 'px;line-height:1.35;color:' + p.text + ';opacity:0.85;overflow:hidden;max-height:' + maxItemH + 'px;word-wrap:break-word">\u2022 ' + escHtml(stripMarkdown(item)) + '</div>';
      itemY += maxItemH;
    }
  }

  const midXBg = Math.round((cW - 60) / 2);
  return SCOPED_RESET + '\n' +
    '<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';">' + '\n' +
    '  ' + bgGradientOverlay(cW, H, p.accent, 0.04, '40%') + '\n' +
    '  <div style="position:absolute;left:' + PAD + 'px;top:' + PAD + 'px;width:' + (cW - PAD * 2) + 'px;text-align:center;font-size:' + titleFontSize(slide.title) + 'px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:' + p.text + ';line-height:1.2">' + escHtml(slide.title) + '</div>' + '\n' +
    '  <div style="position:absolute;left:' + midXBg + 'px;top:' + (PAD + 56) + 'px;width:60px;height:3px;background:' + p.accent + ';border-radius:2px"></div>' + '\n' +
    '  ' + cards + '\n' +
    '</div>';
}

function buildComparison(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  // ── McKinsey table path: detect pipe-delimited table in body ──
  const table = parseMarkdownTable(slide.body);
  if (table) {
    return buildComparisonTable(slide, p, table, hasImage);
  }

  // ── Multi-card path: 3+ items get individual cards ──
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const multiGroups = detectComparisonGroups(lines);
  if (multiGroups && multiGroups.length >= 3) {
    return buildComparisonMultiCard(slide, p, multiGroups, hasImage);
  }

  // ── Card path: two-column layout with VS badge ──
  let leftLines: string[] = [];
  let rightLines: string[] = [];
  let leftTitle = 'Before';
  let rightTitle = 'After';

  const vsIdx = lines.findIndex((l) =>
    l.toLowerCase().trim() === 'vs' || l.toLowerCase().trim() === 'vs.'
  );
  if (vsIdx > -1) {
    leftLines = lines.slice(0, vsIdx);
    rightLines = lines.slice(vsIdx + 1);
  } else {
    // When we have very few lines (prose), expand them by splitting on sentence boundaries
    let expandedLines = lines;
    if (lines.length <= 3) {
      expandedLines = [];
      for (const line of lines) {
        // Split on periods even for shorter lines if we need more items
        if (line.length > 40) {
          const parts = line.split(/(?<=\.)\s+|;\s*|,\s*(?:and|but|while|whereas)\s+/i).filter(Boolean);
          expandedLines.push(...parts);
        } else {
          expandedLines.push(line);
        }
      }
    }
    const mid = Math.ceil(expandedLines.length / 2);
    leftLines = expandedLines.slice(0, mid);
    rightLines = expandedLines.slice(mid);
  }

  // Extract headers
  if (leftLines.length > 0 && !/^[-•]/.test(leftLines[0])) leftTitle = leftLines.shift()!;
  if (rightLines.length > 0 && !/^[-•]/.test(rightLines[0])) rightTitle = rightLines.shift()!;

  // If either side is completely empty after header extraction, populate with the title
  if (leftLines.length === 0) {
    leftLines.push(leftTitle);
  }
  if (rightLines.length === 0) {
    rightLines.push(rightTitle);
  }

  const colW = Math.round((cW - PAD * 2 - 40) / 2);
  const cardY = PAD + 80;                             // 133
  const cardH = H - cardY - PAD;                      // 534
  const rightX = PAD + colW + 40;

  const maxItems = Math.floor((cardH - 80) / 40);
  function renderItems(items: string[], x: number, bullet: string): string {
    let html = '';
    let y = cardY + 68;
    const limited = items.slice(0, maxItems);
    for (const item of limited) {
      html += `<div style="position:absolute;left:${x + 24}px;top:${y}px;width:${colW - 48}px;font-size:18px;line-height:1.4;color:${p.text};opacity:0.85;overflow:hidden;word-wrap:break-word;max-height:62px">${bullet} ${escHtml(stripMarkdown(item))}</div>`;
      y += 56;
    }
    return html;
  }

  const vsCy = cardY + cardH / 2;

  // Center reference for VS badge and title: use cW to stay within content area
  const midX = Math.round(cW / 2);

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:${cardShadow(2, isDarkBackground(p.background))}"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.primary, 0.1)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${PAD + 24}px;top:${cardY + 14}px;font-size:15px;font-weight:bold;color:${p.primary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(stripMarkdown(leftTitle))}</div>
  ${renderItems(leftLines, PAD, '\u2022')}
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:2px solid ${p.accent};border-radius:16px;box-shadow:${cardShadow(3, isDarkBackground(p.background))}"></div>
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.accent, 0.15)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${rightX + 24}px;top:${cardY + 14}px;font-size:15px;font-weight:bold;color:${p.accent};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(stripMarkdown(rightTitle))}</div>
  ${renderItems(rightLines, rightX, '\u2713')}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="vs-arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" opacity="0.4" /></marker>
    </defs>
    <line x1="${midX - 60}" y1="${Math.round(vsCy)}" x2="${midX - 32}" y2="${Math.round(vsCy)}" stroke="${p.border}" stroke-width="1.5" opacity="0.3" marker-end="url(#vs-arrow)" />
    <line x1="${midX + 32}" y1="${Math.round(vsCy)}" x2="${midX + 60}" y2="${Math.round(vsCy)}" stroke="${p.border}" stroke-width="1.5" opacity="0.3" marker-start="url(#vs-arrow)" />
    <circle cx="${midX}" cy="${Math.round(vsCy)}" r="28" fill="${p.background}" stroke="${p.accent}" stroke-width="2" opacity="0.9" />
    <circle cx="${midX}" cy="${Math.round(vsCy)}" r="22" fill="${hexToRgba(p.accent, 0.1)}" stroke="none" />
    <text x="${midX}" y="${Math.round(vsCy + 5)}" text-anchor="middle" fill="${p.accent}" font-size="13" font-weight="bold" letter-spacing="1">VS</text>
  </svg>
</div>`;
}

// ── McKinsey-style comparison table (HTML+SVG) ──────────────

function buildComparisonTable(slide: SlideInput, p: ColorPalette, table: ParsedTable, hasImage = false): string {
  const dark = isDarkBackground(p.background);
  const headerBg = p.primary;
  const headerColor = '#FFFFFF';
  const evenRowBg = dark ? 'rgba(255,255,255,0.04)' : '#F5F5F5';
  const oddRowBg = dark ? 'transparent' : '#FFFFFF';
  const rowBorder = dark ? 'rgba(255,255,255,0.08)' : '#E5E5E5';
  const colCount = table.headers.length;
  const cW = hasImage ? CONTENT_W_IMG : W;
  const tableW = cW - PAD * 2;

  // Title + accent underline
  let y = PAD;
  let html = `<div style="position:absolute;left:${PAD}px;top:${y}px;width:${tableW}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>`;
  y += 42;
  html += `<div style="position:absolute;left:${PAD}px;top:${y}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>`;
  y += 16;

  // Lead text
  if (table.leadText) {
    html += `<div style="position:absolute;left:${PAD}px;top:${y}px;width:${tableW}px;font-size:17px;line-height:1.4;color:${p.text};opacity:0.8">${escHtml(stripMarkdown(table.leadText))}</div>`;
    y += 32;
  }

  // Table
  y += 10;
  const cellPad = hasImage ? 'padding:8px 12px' : 'padding:10px 16px';
  const thStyle = `background:${headerBg};color:${headerColor};font-weight:bold;font-size:${hasImage ? 14 : 16}px;text-align:left;${cellPad};border-bottom:2px solid ${headerBg}`;
  const tableTop = y;

  let tableHtml = '<table style="border-collapse:collapse;width:100%;table-layout:fixed">';
  // Header
  tableHtml += '<thead><tr>';
  for (const h of table.headers) {
    tableHtml += `<th style="${thStyle}">${escHtml(stripMarkdown(h))}</th>`;
  }
  tableHtml += '</tr></thead>';
  // Body rows
  tableHtml += '<tbody>';
  for (let i = 0; i < table.rows.length; i++) {
    const bg = i % 2 === 0 ? evenRowBg : oddRowBg;
    tableHtml += `<tr style="background:${bg}">`;
    for (let c = 0; c < colCount; c++) {
      const val = table.rows[i]?.[c] ?? '';
      const bold = c === 0 ? 'font-weight:bold;' : '';
      tableHtml += `<td style="${bold}font-size:${hasImage ? 15 : 18}px;color:${p.text};${cellPad};border-bottom:1px solid ${rowBorder}">${escHtml(stripMarkdown(val))}</td>`;
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table>';

  // Estimate table height: header(44) + rows(48 each) — accounts for cell padding
  const tableHeight = (hasImage ? 38 : 44) + table.rows.length * (hasImage ? 38 : 48);
  html += `<div style="position:absolute;left:${PAD}px;top:${tableTop}px;width:${tableW}px">${tableHtml}</div>`;
  y = tableTop + tableHeight + 16;

  // Takeaway
  if (table.takeaway) {
    html += `<div style="position:absolute;left:${PAD}px;top:${y}px;width:${tableW}px;font-size:17px;font-weight:bold;color:${p.accent};line-height:1.4">${escHtml(table.takeaway)}</div>`;
    y += 30;
  }

  // Source
  if (table.source) {
    const srcY = Math.max(y + 8, H - PAD - 20);
    html += `<div style="position:absolute;left:${PAD}px;top:${srcY}px;width:${tableW}px;font-size:12px;color:${p.text};opacity:0.5">${escHtml(table.source)}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.03)}
  ${html}
</div>`;
}

// ── TEAM ─────────────────────────────────────────────────────
// Grid of cards with avatar circles + computed initials

function buildTeam(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const members = lines.map((line) => {
    const sep = line.indexOf(' - ');
    if (sep > -1) return { name: line.slice(0, sep).trim(), role: line.slice(sep + 3).trim() };
    return { name: line, role: '' };
  });

  if (members.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = members.length;
  const cols = count <= 3 ? count : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const cardW = 260;
  const cardH = 220;
  const gapX = 32;
  const gapY = 24;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startX = Math.round((cW - totalW) / 2);
  const startY = Math.round(PAD + 90 + (H - PAD * 2 - 90 - totalH) / 2);
  const avatarSize = 64;

  let cardsHtml = '';
  let avatarsSvg = '';

  for (let i = 0; i < members.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    // Card
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:${cardShadow(2, isDarkBackground(p.background))}"></div>`;

    // Name + role
    cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + 100}px;width:${cardW - 24}px;text-align:center;font-size:16px;font-weight:bold;color:${p.text}">${escHtml(members[i].name)}</div>`;
    if (members[i].role) {
      cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + 124}px;width:${cardW - 24}px;text-align:center;font-size:13px;color:${p.text};opacity:0.6">${escHtml(members[i].role)}</div>`;
    }

    // Avatar circle + initials (SVG)
    const avCx = cx + cardW / 2;
    const avCy = cy + 24 + avatarSize / 2;
    const initials = members[i].name
      .split(' ')
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();

    avatarsSvg += `<circle cx="${Math.round(avCx)}" cy="${Math.round(avCy)}" r="${avatarSize / 2}" fill="${p.primary}" opacity="0.15" />`;
    avatarsSvg += `<text x="${Math.round(avCx)}" y="${Math.round(avCy + 7)}" text-anchor="middle" fill="${p.primary}" font-size="18" font-weight="bold">${escHtml(initials)}</text>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${avatarsSvg}
  </svg>
</div>`;
}

// ── FEATURE_GRID ─────────────────────────────────────────────
// Auto-column grid with icon placeholder squares

function buildFeatureGrid(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  let lines = parseBodyLines(slide.body);

  // When body is a single blob paragraph, split on sentence boundaries (threshold: 120 chars)
  if (lines.length < 3 && lines.some((l) => l.length > 120)) {
    const expanded: string[] = [];
    for (const line of lines) {
      if (line.length > 120) {
        const parts = line.split(/(?<=\.)\s+|;\s+/).filter((s) => s.trim().length > 0);
        expanded.push(...parts);
      } else {
        expanded.push(line);
      }
    }
    lines = expanded;
  }

  // Cap at title count or 6 features max
  const fgCap = titleCountCap(slide.title);
  lines = lines.slice(0, fgCap ? Math.min(fgCap, 6) : 6);

  const features = lines.map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1 && sep < 40) return { title: stripMarkdown(line.slice(0, sep).trim()), desc: stripMarkdown(line.slice(sep + 1).trim()) };
    // For lines without a colon, try to split at first comma, dash, or em-dash
    const breakMatch = line.match(/^(.{10,40}?)\s*[,\-—–]\s+(.+)/);
    if (breakMatch) return { title: stripMarkdown(breakMatch[1].trim()), desc: stripMarkdown(breakMatch[2].trim()) };
    // Truncate long titles and use remainder as description
    if (line.length > 50) {
      const spaceIdx = line.indexOf(' ', 30);
      if (spaceIdx > -1) return { title: stripMarkdown(line.slice(0, spaceIdx).trim()), desc: stripMarkdown(line.slice(spaceIdx + 1).trim()) };
    }
    return { title: stripMarkdown(line), desc: '' };
  });

  if (features.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = features.length;
  const fgVariant = layoutVariant(slide.title, slide.body, 3);

  // Variant 1: Horizontal row layout (alternates with grid)
  if (fgVariant === 1 && count >= 3) {
    const rowH = Math.min(80, Math.round((H - PAD * 2 - 90) / count));
    const rowW = cW - PAD * 2 - 20;
    const rowStartY = PAD + 85;
    const fgAccV = cardAccentColors(p);
    let rowHtml = '';
    for (let ri = 0; ri < count; ri++) {
      const ry = rowStartY + ri * (rowH + 8);
      const rc = fgAccV[ri % fgAccV.length];
      // Left accent bar
      rowHtml += '<div style="position:absolute;left:' + PAD + 'px;top:' + ry + 'px;width:4px;height:' + rowH + 'px;background:' + rc + ';border-radius:2px"></div>';
      // Number badge
      rowHtml += '<div style="position:absolute;left:' + (PAD + 16) + 'px;top:' + (ry + Math.round((rowH - 28) / 2)) + 'px;width:28px;height:28px;border-radius:50%;background:' + hexToRgba(rc, 0.15) + ';text-align:center;line-height:28px;font-size:13px;font-weight:bold;color:' + rc + '">' + (ri + 1) + '</div>';
      // Title (bold, accent colored)
      rowHtml += '<div style="position:absolute;left:' + (PAD + 56) + 'px;top:' + (ry + 6) + 'px;width:' + Math.round(rowW * 0.3) + 'px;font-size:19px;font-weight:bold;color:' + rc + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(features[ri].title) + '</div>';
      // Description (lighter)
      if (features[ri].desc) {
        rowHtml += '<div style="position:absolute;left:' + (PAD + 56 + Math.round(rowW * 0.32)) + 'px;top:' + (ry + 6) + 'px;width:' + Math.round(rowW * 0.62) + 'px;font-size:17px;line-height:1.35;color:' + p.text + ';opacity:0.8;overflow:hidden;max-height:' + (rowH - 12) + 'px">' + escHtml(features[ri].desc) + '</div>';
      }
    }
    return SCOPED_RESET + '\n<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';">' +
      bgGradientOverlay(cW, H, p.accent, 0.04) +
      '<div style="position:absolute;left:' + PAD + 'px;top:' + PAD + 'px;width:' + (cW - PAD * 2) + 'px;font-size:' + titleFontSize(slide.title) + 'px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:' + p.text + ';line-height:1.2">' + escHtml(slide.title) + '</div>' +
      '<div style="position:absolute;left:' + PAD + 'px;top:' + (PAD + 48) + 'px;width:60px;height:3px;background:' + p.accent + ';border-radius:2px"></div>' +
      rowHtml +
      '</div>';
  }
  // Variant 2: Bento grid — DISABLED (broken in Marp PDF renderer, text invisible)
  // Falls through to default grid variant which renders correctly
  if (false && fgVariant === 2 && count >= 3) {
    const dark = isDarkBackground(p.background);
    const bentoAccents = cardAccentColors(p);
    const bentoGap = 16;
    const bentoStartY = PAD + 82;
    const bentoAvailW = cW - PAD * 2;
    const bentoAvailH = H - bentoStartY - PAD;
    let bentoHtml = '';

    // Hero card — full width, taller
    const heroH = Math.round(bentoAvailH * 0.33);
    const heroColor = bentoAccents[0];
    const heroBg = dark ? hexToRgba(p.surface, 0.6) : p.surface;
    const heroStyle = dark
      ? `backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);box-shadow:${cardShadow(3, true)}`
      : `border:1px solid ${p.border};box-shadow:${cardShadow(3, false)}`;
    bentoHtml += `<div style="position:absolute;left:${PAD}px;top:${bentoStartY}px;width:${bentoAvailW}px;height:${heroH}px;background:${heroBg};${heroStyle};border-radius:16px;overflow:hidden"></div>`;
    // Diagonal clip accent on hero
    bentoHtml += `<div style="position:absolute;left:${PAD}px;top:${bentoStartY}px;width:${bentoAvailW}px;height:${heroH}px;background:linear-gradient(135deg,${hexToRgba(heroColor, 0.08)} 0%,transparent 40%);border-radius:16px;pointer-events:none"></div>`;
    // Hero icon
    bentoHtml += `<div style="position:absolute;left:${PAD + 24}px;top:${bentoStartY + 20}px;width:40px;height:40px;background:${heroColor};border-radius:10px;opacity:0.85"></div>`;
    // Hero title
    bentoHtml += `<div style="position:absolute;left:${PAD + 24}px;top:${bentoStartY + 72}px;width:${bentoAvailW - 48}px;font-size:26px;font-weight:bold;color:${heroColor};overflow:hidden;max-height:36px;line-height:1.3">${escHtml(features[0].title)}</div>`;
    if (features[0].desc) {
      bentoHtml += `<div style="position:absolute;left:${PAD + 24}px;top:${bentoStartY + 104}px;width:${bentoAvailW - 48}px;font-size:18px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;max-height:${heroH - 120}px">${escHtml(features[0].desc)}</div>`;
    }

    // Remaining items in 2-column grid
    const gridTop = bentoStartY + heroH + bentoGap;
    const gridAvailH = H - gridTop - PAD;
    const gridCols = 2;
    const gridCardW = Math.round((bentoAvailW - bentoGap) / gridCols);
    const remaining = features.slice(1);
    const gridRows = Math.ceil(remaining.length / gridCols);
    const gridCardH = Math.min(160, Math.round((gridAvailH - (gridRows - 1) * bentoGap) / gridRows));

    for (let gi = 0; gi < remaining.length; gi++) {
      const gc = gi % gridCols;
      const gr = Math.floor(gi / gridCols);
      const gx = PAD + gc * (gridCardW + bentoGap);
      const gy = gridTop + gr * (gridCardH + bentoGap);
      const gColor = bentoAccents[(gi + 1) % bentoAccents.length];
      bentoHtml += `<div style="position:absolute;left:${gx}px;top:${gy}px;width:${gridCardW}px;height:${gridCardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:12px;box-shadow:${cardShadow(2, dark)};border-left:4px solid ${gColor};overflow:hidden"></div>`;
      bentoHtml += `<div style="position:absolute;left:${gx + 18}px;top:${gy + 14}px;width:${gridCardW - 36}px;font-size:18px;font-weight:bold;color:${gColor};overflow:hidden;max-height:30px">${escHtml(remaining[gi].title)}</div>`;
      if (remaining[gi].desc) {
        bentoHtml += `<div style="position:absolute;left:${gx + 18}px;top:${gy + 40}px;width:${gridCardW - 36}px;font-size:16px;line-height:1.35;color:${p.text};opacity:0.8;overflow:hidden;max-height:${gridCardH - 48}px">${escHtml(remaining[gi].desc)}</div>`;
      }
    }

    const titleGlow = dark ? `;${textGlow(p.accent, 0.25)}` : '';
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.accent, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${bentoHtml}
</div>`;
  }

  const cols = count <= 3 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gapX = 24;
  const gapY = 20;
  const cardW = Math.round((cW - PAD * 2 - (cols - 1) * gapX) / cols);
  // Dynamic card height: use all available vertical space
  const availH = H - PAD * 2 - 90; // subtract title area
  const cardH = Math.min(280, Math.round((availH - (rows - 1) * gapY) / rows));
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startY = Math.round(PAD + 80 + (H - PAD * 2 - 80 - totalH) / 2);
  // Scale font sizes based on card height
  const titleFontSz = cardH >= 220 ? 22 : 20;
  const descFontSz = cardH >= 220 ? 18 : 16;
  const descMaxH = Math.max(20, cardH - 100);
  const accents = cardAccentColors(p);

  let html = '';
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);
    const cardColor = accents[i % accents.length];

    html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:${cardShadow(2, isDarkBackground(p.background))};border-top:4px solid ${cardColor}"></div>`;
    // Icon placeholder — uses card accent color
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 20}px;width:32px;height:32px;background:${cardColor};border-radius:8px;opacity:0.8"></div>`;
    // Title (allow 2-line wrap)
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 64}px;width:${cardW - 40}px;font-size:${titleFontSz}px;font-weight:bold;color:${cardColor};overflow:hidden;max-height:40px;line-height:1.3">${escHtml(features[i].title)}</div>`;
    // Description
    if (features[i].desc) {
      html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 100}px;width:${cardW - 40}px;font-size:${descFontSz}px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;max-height:${descMaxH}px">${escHtml(features[i].desc)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.accent, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${html}
</div>`;
}

// ── PROCESS ─────────────────────────────────────────────────
// Numbered step cards with connectors

function buildProcess(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const rawLines = parseBodyLines(slide.body);
  const lines = splitProseToItems(rawLines, 3)
    // Strip arrow prefixes (→/►/▸/➜) from step lines — they're content, not CTA
    .map((l) => l.trim().replace(/^[→►▸➜]\s*/, ''))
    // Filter out short CTA-style lines only
    .filter((l) => !/^(get started|start sprint|learn more|contact us|sign up|next step)/i.test(l.trim()))
    .filter((l) => l.trim().length >= 10);  // skip very short fragments
  const rawSteps = lines.map((line, i) => {
    const numMatch = line.match(/^\d+\.\s*/);
    const cleaned = numMatch ? line.slice(numMatch[0].length) : line;
    const sepIdx = cleaned.indexOf(':');
    if (sepIdx > -1 && sepIdx < 50) return { num: i + 1, title: stripMarkdown(cleaned.slice(0, sepIdx).trim()), desc: stripMarkdown(cleaned.slice(sepIdx + 1).trim()) };
    // For long lines without colons, split at first comma or dash to create title + description
    if (cleaned.length > 60) {
      const breakMatch = cleaned.match(/^(.{10,45}?)\s*[,\-—–]\s+(.*)/);
      if (breakMatch) return { num: i + 1, title: stripMarkdown(breakMatch[1].trim()), desc: stripMarkdown(breakMatch[2].trim()) };
    }
    return { num: i + 1, title: stripMarkdown(cleaned), desc: '' };
  });
  // Filter out steps with empty titles after processing
  const unfilteredSteps = rawSteps.filter((s) => s.title.length > 0).map((s, i) => ({ ...s, num: i + 1 }));
  const stepCap = titleCountCap(slide.title);
  const steps = stepCap ? unfilteredSteps.slice(0, stepCap) : unfilteredSteps;

  const procVariant = layoutVariant(slide.title, slide.body, 3);

  // Variant 1: Vertical timeline layout (alternates with card grid)
  if (procVariant === 1 && steps.length >= 3 && steps.length <= 6) {
    const vtStartY = PAD + 80;
    const vtStepH = Math.min(90, Math.round((H - vtStartY - PAD) / steps.length));
    const vtAccents = cardAccentColors(p);
    const vtLineX = PAD + 40;
    let vtHtml = '';
    // Vertical line
    vtHtml += '<div style="position:absolute;left:' + vtLineX + 'px;top:' + vtStartY + 'px;width:2px;height:' + (steps.length * vtStepH - 10) + 'px;background:' + hexToRgba(p.border, 0.4) + '"></div>';
    for (let vi = 0; vi < steps.length; vi++) {
      const vy = vtStartY + vi * vtStepH;
      const vc = vtAccents[vi % vtAccents.length];
      // Circle node on line
      vtHtml += '<div style="position:absolute;left:' + (vtLineX - 14) + 'px;top:' + (vy + 4) + 'px;width:30px;height:30px;border-radius:50%;background:' + vc + ';text-align:center;line-height:30px;font-size:14px;font-weight:bold;color:#fff">' + steps[vi].num + '</div>';
      // Title
      vtHtml += '<div style="position:absolute;left:' + (vtLineX + 30) + 'px;top:' + (vy + 2) + 'px;width:' + (cW - vtLineX - 30 - PAD) + 'px;font-size:16px;font-weight:bold;color:' + vc + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(steps[vi].title) + '</div>';
      // Description
      if (steps[vi].desc) {
        vtHtml += '<div style="position:absolute;left:' + (vtLineX + 30) + 'px;top:' + (vy + 24) + 'px;width:' + (cW - vtLineX - 30 - PAD) + 'px;font-size:13px;line-height:1.4;color:' + p.text + ';opacity:0.8;overflow:hidden;max-height:' + (vtStepH - 32) + 'px">' + escHtml(steps[vi].desc) + '</div>';
      }
    }
    return SCOPED_RESET + '\n<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';">' +
      bgGradientOverlay(cW, H, p.primary, 0.04) +
      '<div style="position:absolute;left:' + PAD + 'px;top:' + PAD + 'px;width:' + (cW - PAD * 2) + 'px;font-size:' + titleFontSize(slide.title) + 'px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:' + p.text + ';line-height:1.2">' + escHtml(slide.title) + '</div>' +
      '<div style="position:absolute;left:' + PAD + 'px;top:' + (PAD + 48) + 'px;width:60px;height:3px;background:' + p.accent + ';border-radius:2px"></div>' +
      vtHtml +
      '</div>';
  }

  // Variant 2: Numbered circle chain — circles connected by horizontal line
  if (procVariant === 2 && steps.length >= 3 && steps.length <= 6) {
    const dark = isDarkBackground(p.background);
    const circCount = Math.min(steps.length, 5);
    const circR = 30;
    const circLineY = Math.round(H * 0.38);
    const circStartX = PAD + 80;
    const circEndX = (hasImage ? CONTENT_W_IMG : W) - PAD - 80;
    const circSpacing = (circEndX - circStartX) / (circCount - 1 || 1);
    const circAccents = cardAccentColors(p);
    let circSvg = '';
    let circHtml = '';

    // Connecting line
    circSvg += `<line x1="${circStartX}" y1="${circLineY}" x2="${circEndX}" y2="${circLineY}" stroke="${p.border}" stroke-width="3" opacity="0.25" />`;

    for (let ci = 0; ci < circCount; ci++) {
      const cx = circCount === 1 ? Math.round(cW / 2) : Math.round(circStartX + ci * circSpacing);
      const color = circAccents[ci % circAccents.length];

      // Outer decorative ring with conic gradient effect (approximated with two half-circles)
      circSvg += `<circle cx="${cx}" cy="${circLineY}" r="${circR + 6}" fill="none" stroke="${hexToRgba(color, 0.15)}" stroke-width="3" />`;
      // Main circle
      circSvg += `<circle cx="${cx}" cy="${circLineY}" r="${circR}" fill="${color}" />`;
      // Number inside circle
      circSvg += `<text x="${cx}" y="${circLineY + 6}" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="bold">${steps[ci].num}</text>`;

      // Step title below circle
      const titleW = Math.round(circSpacing - 20);
      circHtml += `<div style="position:absolute;left:${cx - titleW / 2}px;top:${circLineY + circR + 16}px;width:${titleW}px;text-align:center;font-size:14px;font-weight:bold;color:${color};overflow:hidden;max-height:40px;line-height:1.3">${escHtml(steps[ci].title)}</div>`;
      // Description below title
      if (steps[ci].desc) {
        circHtml += `<div style="position:absolute;left:${cx - titleW / 2}px;top:${circLineY + circR + 56}px;width:${titleW}px;text-align:center;font-size:12px;line-height:1.4;color:${p.text};opacity:0.75;overflow:hidden;max-height:80px">${escHtml(steps[ci].desc)}</div>`;
      }
    }

    const titleGlow = dark ? `;${textGlow(p.accent, 0.25)}` : '';
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${circSvg}
  </svg>
  ${circHtml}
</div>`;
  }

  if (steps.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = Math.min(steps.length, 6);
  // 2-row layout for 5+ steps; single row for 1-4
  const useRows = count >= 5;
  const cols = useRows ? Math.ceil(count / 2) : count;
  const rows = useRows ? 2 : 1;
  const cardW = cols <= 3 ? 300 : 260;
  const gapX = 24;
  const gapY = 20;
  const cardH = useRows ? 220 : (count <= 3 ? 340 : 300);
  const totalW = cols * cardW + (cols - 1) * gapX;
  const startX = Math.round((cW - totalW) / 2);
  const cardY = Math.round(PAD + 90);

  const procAccents = cardAccentColors(p);
  let cardsHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const col = useRows ? (i % cols) : i;
    const row = useRows ? Math.floor(i / cols) : 0;
    const cx = startX + col * (cardW + gapX);
    const cy = cardY + row * (cardH + gapY);
    const stepColor = procAccents[i % procAccents.length];
    // Card background
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:${cardShadow(2, isDarkBackground(p.background))};border-top:4px solid ${stepColor}"></div>`;
    // Step number circle — uses step accent color
    cardsHtml += `<div style="position:absolute;left:${cx + cardW / 2 - 20}px;top:${cy + 16}px;width:40px;height:40px;border-radius:50%;background:${stepColor};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#FFFFFF;text-align:center;line-height:40px">${String(steps[i].num).padStart(2, '0')}</div>`;
    // Title
    cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cy + 66}px;width:${cardW - 32}px;text-align:center;font-size:15px;font-weight:bold;color:${stepColor};overflow:hidden;max-height:40px">${escHtml(steps[i].title)}</div>`;
    // Description
    if (steps[i].desc) {
      cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cy + 100}px;width:${cardW - 32}px;text-align:center;font-size:13px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;max-height:${cardH - 120}px">${escHtml(steps[i].desc)}</div>`;
    }
    // Connector arrow between cards (same row only)
    if (!useRows && i < count - 1) {
      const arrowX1 = cx + cardW + 2;
      const arrowX2 = cx + cardW + gapX - 2;
      const arrowY = cy + cardH / 2;
      connectorsSvg += `<line x1="${arrowX1}" y1="${arrowY}" x2="${arrowX2}" y2="${arrowY}" stroke="${p.border}" stroke-width="2" marker-end="url(#arrowhead)" />`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" /></marker></defs>
    ${connectorsSvg}
  </svg>
</div>`;
}

// ── PROBLEM ─────────────────────────────────────────────────
// Left accent bar + warning-style icon
// When body has a table, renders as styled table for vertical alignment

function buildProblemTable(slide: SlideInput, p: ColorPalette, table: ParsedTable, hasImage: boolean): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const barColor = p.error || p.accent;
  const dark = isDarkBackground(p.background);
  const headerBg = barColor;
  const headerColor = '#FFFFFF';
  const evenRowBg = dark ? 'rgba(255,255,255,0.04)' : '#F5F5F5';
  const oddRowBg = dark ? 'transparent' : '#FFFFFF';
  const rowBorder = dark ? 'rgba(255,255,255,0.08)' : '#E5E5E5';
  const colCount = table.headers.length;
  const tableW = cW - PAD * 2 - 20;

  let y = PAD;
  let html = '';

  // Warning icon + title
  html += '<svg style="position:absolute;left:' + (PAD + 4) + 'px;top:' + PAD + 'px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">' +
    '<polygon points="16,2 30,28 2,28" fill="none" stroke="' + barColor + '" stroke-width="2"/>' +
    '<text x="16" y="24" text-anchor="middle" fill="' + barColor + '" font-size="16" font-weight="bold">!</text></svg>';
  html += '<div style="position:absolute;left:' + (PAD + 44) + 'px;top:' + (PAD + 4) + 'px;width:' + (cW - PAD * 2 - 60) + 'px;font-size:' + titleFontSize(slide.title) + 'px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:' + p.text + ';line-height:1.2">' + escHtml(slide.title) + '</div>';
  y += 56;
  html += '<div style="position:absolute;left:' + (PAD + 44) + 'px;top:' + (y - 8) + 'px;width:60px;height:3px;background:' + barColor + ';border-radius:2px"></div>';

  // Lead text
  if (table.leadText) {
    html += '<div style="position:absolute;left:' + (PAD + 20) + 'px;top:' + y + 'px;width:' + tableW + 'px;font-size:15px;line-height:1.4;color:' + p.text + ';opacity:0.8">' + escHtml(stripMarkdown(table.leadText)) + '</div>';
    y += 30;
  }

  y += 10;
  const cellPad = 'padding:8px 14px';
  const thStyle = 'background:' + headerBg + ';color:' + headerColor + ';font-weight:bold;font-size:14px;text-align:left;' + cellPad + ';border-bottom:2px solid ' + headerBg;

  let tableHtml = '<table style="border-collapse:collapse;width:100%;table-layout:fixed">';
  tableHtml += '<thead><tr>';
  for (const h of table.headers) {
    tableHtml += '<th style="' + thStyle + '">' + escHtml(stripMarkdown(h)) + '</th>';
  }
  tableHtml += '</tr></thead><tbody>';
  for (let i = 0; i < table.rows.length; i++) {
    const bg = i % 2 === 0 ? evenRowBg : oddRowBg;
    tableHtml += '<tr style="background:' + bg + '">';
    for (let c = 0; c < colCount; c++) {
      const val = table.rows[i]?.[c] ?? '';
      const bold = c === 0 ? 'font-weight:bold;' : '';
      tableHtml += '<td style="' + bold + 'font-size:14px;color:' + p.text + ';' + cellPad + ';border-bottom:1px solid ' + rowBorder + '">' + escHtml(stripMarkdown(val)) + '</td>';
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table>';

  const tableHeight = 38 + table.rows.length * 38;
  html += '<div style="position:absolute;left:' + (PAD + 20) + 'px;top:' + y + 'px;width:' + tableW + 'px">' + tableHtml + '</div>';
  y += tableHeight + 12;

  if (table.takeaway) {
    html += '<div style="position:absolute;left:' + (PAD + 20) + 'px;top:' + y + 'px;width:' + tableW + 'px;font-size:15px;font-weight:bold;color:' + barColor + ';line-height:1.4">' + escHtml(table.takeaway) + '</div>';
  }

  return SCOPED_RESET + '\n<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';">' +
    bgGradientOverlay(cW, H, barColor, 0.04, '30%') +
    '<div style="position:absolute;left:0;top:0;width:6px;height:' + H + 'px;background:' + barColor + '"></div>' +
    html + '</div>';
}


function buildProblem(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;

  // If body has a pipe table, render as styled table (preserves all content)
  const probTable = parseMarkdownTable(slide.body);
  if (probTable) {
    return buildProblemTable(slide, p, probTable, hasImage);
  }

  const lines = parseBodyLines(slide.body);
  const barColor = p.error || p.accent;
  const probVariant = layoutVariant(slide.title, slide.body, 2);

  // Variant 1: Split diagonal — colored triangle zone + 2-column items
  if (probVariant === 1 && lines.length >= 3) {
    const dark = isDarkBackground(p.background);
    const probCap2 = titleCountCap(slide.title);
    const items = lines.slice(0, probCap2 || 6);
    const col1 = items.slice(0, Math.ceil(items.length / 2));
    const col2 = items.slice(Math.ceil(items.length / 2));
    const colW = Math.round((cW - PAD * 2 - 40) / 2);
    const itemStartY = PAD + 110;
    const itemSpacing = Math.min(130, Math.round((H - itemStartY - PAD) / Math.max(col1.length, col2.length)));
    const pAccents = cardAccentColors(p);
    let itemsHtml = '';

    // Render column items
    const renderCol = (col: string[], startX: number) => {
      let y = itemStartY;
      for (let i = 0; i < col.length; i++) {
        const ic = pAccents[i % pAccents.length];
        itemsHtml += `<div style="position:absolute;left:${startX}px;top:${y}px;width:${colW}px;max-height:${itemSpacing - 10}px;font-size:21px;line-height:1.35;color:${p.text};opacity:0.9;overflow:hidden;padding-left:12px;border-left:3px solid ${hexToRgba(ic, 0.7)}"><span style="font-weight:600;color:${ic}">${escHtml(stripMarkdown(col[i]).split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(stripMarkdown(col[i]).split(/\s+/).slice(2).join(" "))}</div>`;
        y += itemSpacing;
      }
    };
    renderCol(col1, PAD + 20);
    renderCol(col2, PAD + 20 + colW + 40);

    const titleGlow = dark ? `;${textGlow(barColor, 0.3)}` : '';
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, barColor, 0.04, '30%')}
  <div style="position:absolute;left:0;top:0;width:${Math.round(cW * 0.45)}px;height:${Math.round(H * 0.35)}px;background:linear-gradient(135deg,${hexToRgba(barColor, 0.08)} 0%,transparent 100%);pointer-events:none"></div>
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <polygon points="16,2 30,28 2,28" fill="none" stroke="${barColor}" stroke-width="2"/>
    <text x="16" y="24" text-anchor="middle" fill="${barColor}" font-size="16" font-weight="bold">!</text>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${itemsHtml}
</div>`;
  }

  // Detect if first line looks like a table header (short, no numbers/dollar signs)
  const isHeader = lines.length > 2 && !/\d/.test(lines[0]) && !/[$€£¥]/.test(lines[0]) && lines[0].length < 60;
  const headerLine = isHeader ? lines[0] : null;
  const probCap = titleCountCap(slide.title);
  const dataLines = isHeader ? lines.slice(1, probCap ? probCap + 1 : 7) : lines.slice(0, probCap || 6);

  // Dynamic spacing: fit all items within available vertical space
  const startY = PAD + 100 + (headerLine ? 32 : 0);
  const availH = H - startY - PAD - 10;
  const itemSpacing = Math.min(130, Math.round(availH / dataLines.length));
  const itemMaxH = itemSpacing - 8;
  const itemFontSz = dataLines.length > 4 ? 22 : 26;

  const probAccents = cardAccentColors(p);
  let bodyHtml = '';
  let ty = PAD + 100;

  // Render header label if detected
  if (headerLine) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;font-size:11px;line-height:1.6;color:${p.text};opacity:0.6;padding-left:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:bold">${escHtml(stripMarkdown(headerLine))}</div>`;
    ty += 32;
  }

  for (let pi = 0; pi < dataLines.length; pi++) {
    const itemColor = probAccents[pi % probAccents.length];
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;max-height:${itemMaxH}px;font-size:${itemFontSz}px;line-height:1.45;color:${p.text};opacity:0.9;padding-left:12px;border-left:3px solid ${hexToRgba(itemColor, 0.7)};overflow:hidden"><span style=\"font-weight:600;color:${itemColor}\">${escHtml(stripMarkdown(dataLines[pi]).split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(stripMarkdown(dataLines[pi]).split(/\s+/).slice(2).join(" "))}</div>`;
    ty += itemSpacing;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, barColor, 0.04, '30%')}
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <polygon points="16,2 30,28 2,28" fill="none" stroke="${barColor}" stroke-width="2"/>
    <text x="16" y="24" text-anchor="middle" fill="${barColor}" font-size="16" font-weight="bold">!</text>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── SOLUTION ────────────────────────────────────────────────
// Left accent bar + checkmark icon

function buildSolution(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const barColor = p.success || p.accent;

  const solCap = titleCountCap(slide.title);
  const solutionItems = lines.slice(0, solCap || 6);
  const solVariant = layoutVariant(slide.title, slide.body, 2);

  // Variant 1: Checkmark cascade — SVG checkmark circles + staircase indent
  if (solVariant === 1 && solutionItems.length >= 2) {
    const dark = isDarkBackground(p.background);
    const cascStartY = PAD + 100;
    const cascAvailH = H - cascStartY - PAD - 10;
    const cascSpacing = Math.min(76, Math.round(cascAvailH / solutionItems.length));
    const cascFontSz = solutionItems.length > 4 ? 14 : 16;
    const cascAccents = cardAccentColors(p);
    let cascHtml = '';

    for (let ci = 0; ci < solutionItems.length; ci++) {
      const indent = ci * 10; // Staircase progression
      const cx = PAD + 32 + indent;
      const cy = cascStartY + ci * cascSpacing;
      const ic = cascAccents[ci % cascAccents.length];

      // Checkmark circle (SVG inline)
      cascHtml += `<svg style="position:absolute;left:${cx}px;top:${cy}px" width="28" height="28" xmlns="http://www.w3.org/2000/svg">`;
      cascHtml += `<circle cx="14" cy="14" r="13" fill="${hexToRgba(ic, 0.12)}" stroke="${ic}" stroke-width="1.5"/>`;
      cascHtml += `<polyline points="8,14 12,19 20,9" fill="none" stroke="${ic}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      cascHtml += `</svg>`;

      // Text after checkmark
      cascHtml += `<div style="position:absolute;left:${cx + 36}px;top:${cy + 2}px;width:${cW - cx - 36 - PAD - 20}px;max-height:${cascSpacing - 8}px;font-size:${cascFontSz}px;line-height:1.5;color:${p.text};opacity:0.9;overflow:hidden"><span style="font-weight:600;color:${ic}">${escHtml(stripMarkdown(solutionItems[ci]).split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(stripMarkdown(solutionItems[ci]).split(/\s+/).slice(2).join(" "))}</div>`;
    }

    const titleGlow = dark ? `;${textGlow(barColor, 0.25)}` : '';
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, barColor, 0.04, '30%')}
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="none" stroke="${barColor}" stroke-width="2"/>
    <polyline points="10,16 14,22 24,10" fill="none" stroke="${barColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${cascHtml}
</div>`;
  }

  const solStartY = PAD + 100;
  const solAvailH = H - solStartY - PAD - 10;
  const solSpacing = Math.min(76, Math.round(solAvailH / solutionItems.length));
  const solMaxH = solSpacing - 8;
  const solFontSz = solutionItems.length > 4 ? 14 : 16;

  const solAccents = cardAccentColors(p);
  let bodyHtml = '';
  let ty = solStartY;
  for (let si = 0; si < solutionItems.length; si++) {
    const solItemColor = solAccents[si % solAccents.length];
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;max-height:${solMaxH}px;font-size:${solFontSz}px;line-height:1.5;color:${p.text};opacity:0.9;padding-left:12px;border-left:3px solid ${hexToRgba(solItemColor, 0.7)};overflow:hidden"><span style=\"font-weight:600;color:${solItemColor}\">${escHtml(stripMarkdown(solutionItems[si]).split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(stripMarkdown(solutionItems[si]).split(/\s+/).slice(2).join(" "))}</div>`;
    ty += solSpacing;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, barColor, 0.04, '30%')}
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="none" stroke="${barColor}" stroke-width="2"/>
    <polyline points="10,16 14,22 24,10" fill="none" stroke="${barColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── CTA ─────────────────────────────────────────────────────
// Centered action card

function buildCta(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const lines = parseBodyLines(slide.body);
  const visibleW = hasImage ? Math.round(W * 0.7) : W;
  const cardW = hasImage ? 560 : 700;
  const cardH = 340;
  const cardX = Math.round((visibleW - cardW) / 2);
  const cardY = Math.round((H - cardH) / 2) + 10;

  // Estimate title height for accent line positioning
  const charsPerLine = Math.floor((cardW - 80) / 14);
  const titleLines = Math.max(1, Math.ceil(slide.title.length / charsPerLine));
  const titleH = 32 + titleLines * 34;  // 32px top pad + 34px per line

  let actionsHtml = '';
  let ay = cardY + titleH + 24;
  for (const line of lines.slice(0, 3)) {
    actionsHtml += `<div style="position:absolute;left:${cardX + 40}px;top:${ay}px;width:${cardW - 80}px;font-size:16px;line-height:1.5;color:${p.text}"><span style="color:${p.accent};font-weight:bold;margin-right:8px">&rarr;</span>${escHtml(stripMarkdown(line))}</div>`;
    ay += 44;
  }

  // Button-style CTA element at bottom of card
  const btnY = cardY + cardH - 60;
  const btnW = 180;
  const btnHtml = `<div style="position:absolute;left:${Math.round(cardX + (cardW - btnW) / 2)}px;top:${btnY}px;width:${btnW}px;height:40px;background:${p.accent};border-radius:8px;text-align:center;line-height:40px;font-size:14px;font-weight:bold;color:#FFFFFF;letter-spacing:0.04em">Get Started &rarr;</div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:radial-gradient(ellipse 900px 700px at 50% 50%,${hexToRgba(p.accent, 0.10)} 0%,transparent 70%)"></div>
  <div style="position:absolute;left:${cardX}px;top:${cardY}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:2px solid ${p.accent};border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,0.10),0 12px 48px ${hexToRgba(p.accent, 0.15)}"></div>
  <div style="position:absolute;left:${cardX}px;top:${cardY}px;width:${cardW}px;height:5px;background:linear-gradient(90deg,${p.accent},${p.primary});border-radius:20px 20px 0 0"></div>
  <div style="position:absolute;left:${cardX}px;top:${cardY + 32}px;width:${cardW}px;text-align:center;font-size:28px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round(visibleW / 2 - 30)}px;top:${cardY + titleH + 8}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${actionsHtml}
  ${btnHtml}
</div>`;
}


// ── CONTENT ─────────────────────────────────────────────────
// Left accent bar + card rows for body lines

function buildContent(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;

  // If body has a pipe table, render as comparison-style table
  const contTable = parseMarkdownTable(slide.body);
  if (contTable) {
    return buildComparisonTable(slide, p, contTable, hasImage);
  }

  const lines = parseBodyLines(slide.body);
  const contCap = titleCountCap(slide.title);
  const items = lines.slice(0, contCap || 8);

  // Dynamic card sizing — fit all items vertically
  const contentStartY = PAD + 100;
  const contentAvailH = H - contentStartY - PAD;
  const cardGap = 10;
  const cardH = Math.min(150, Math.round((contentAvailH - (items.length - 1) * cardGap) / items.length));
  const cardPad = 14;
  const cardW = cW - PAD * 2 - 40;
  const fontSize = cardH >= 70 ? 26 : cardH >= 55 ? 22 : 18;

  const contAccents = cardAccentColors(p);
  let bodyHtml = '';
  let ty = contentStartY;

  for (let ci = 0; ci < items.length; ci++) {
    const rowColor = contAccents[ci % contAccents.length];
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cardW}px;height:${cardH}px;background:${hexToRgba(p.surface, 0.5)};border:1px solid ${hexToRgba(p.border, 0.3)};border-radius:10px;border-left:4px solid ${hexToRgba(rowColor, 0.7)};overflow:hidden"></div>`;
    bodyHtml += `<div style="position:absolute;left:${PAD + 32 + cardPad}px;top:${ty + Math.round((cardH - fontSize * 1.45) / 2)}px;width:${cardW - cardPad * 2}px;max-height:${cardH - 12}px;font-size:${fontSize}px;line-height:1.45;color:${p.text};opacity:0.9;overflow:hidden"><span style="font-weight:600;color:${rowColor}">${escHtml(stripMarkdown(items[ci]).split(/\s+/).slice(0, 2).join(" "))}</span> ${escHtml(stripMarkdown(items[ci]).split(/\s+/).slice(2).join(" "))}</div>`;
    ty += cardH + cardGap;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:0;width:4px;height:${H}px;background:${p.accent}"></div>
  <div style="position:absolute;left:${PAD + 20}px;top:${PAD}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 20}px;top:${PAD + 48}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── QUOTE ───────────────────────────────────────────────────
// Large decorative quotation mark + centered quote text + attribution

function buildQuote(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);

  // Last line that looks like an attribution (starts with - or em-dash, or contains title keywords)
  let quoteLines = [...lines];
  let attribution = '';
  if (quoteLines.length > 1) {
    const lastLine = quoteLines[quoteLines.length - 1];
    if (/^[-\u2014\u2013]/.test(lastLine) || /\b(CEO|CTO|Author|Founder|VP|Director|Manager|Head of)\b/i.test(lastLine)) {
      attribution = lastLine.replace(/^[-\u2014\u2013]\s*/, '');
      quoteLines = quoteLines.slice(0, -1);
    }
  }

  const quoteText = quoteLines.join(' ');
  const fontSize = quoteText.length > 200 ? 18 : quoteText.length > 100 ? 22 : 28;
  const quoteY = Math.round(H * 0.3);

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.accent, 0.05, '50%')}
  <div style="position:absolute;left:${PAD + 40}px;top:${quoteY - 80}px;font-size:160px;font-family:Georgia,serif;color:${p.accent};opacity:0.2;line-height:1">\u201C</div>
  <div style="position:absolute;left:${PAD + 80}px;top:${quoteY}px;width:${cW - PAD * 2 - 160}px;font-size:${fontSize}px;font-style:italic;line-height:1.5;color:${p.text};text-align:center">${escHtml(quoteText)}</div>
  ${attribution ? `<div style="position:absolute;left:${PAD + 80}px;bottom:${PAD + 60}px;width:${cW - PAD * 2 - 160}px;font-size:14px;color:${p.text};opacity:0.6;text-align:center;letter-spacing:0.04em">\u2014 ${escHtml(attribution)}</div>` : ''}
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;bottom:${PAD + 30}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
</div>`;
}

// ── ARCHITECTURE ─────────────────────────────────────────────
// Horizontal flow diagram: connected box nodes with SVG connectors

function buildArchitecture(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const archCap = titleCountCap(slide.title);
  const nodes = lines.slice(0, archCap || 6);

  if (nodes.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = nodes.length;
  // 2-row grid for 5+ nodes; single row for 1-4
  const useRows = count >= 5;
  const cols = useRows ? Math.ceil(count / 2) : count;
  const rowCount = useRows ? 2 : 1;
  const gapX = 28;
  const gapY = 24;
  // Dynamic box width — fill available horizontal space
  const boxW = Math.min(280, Math.round((cW - PAD * 2 - (cols - 1) * gapX) / cols));
  const boxH = useRows ? 180 : (count <= 3 ? 260 : 180);
  const totalW = cols * boxW + (cols - 1) * gapX;
  const totalH = rowCount * boxH + (rowCount - 1) * gapY;
  const startX = Math.round((cW - totalW) / 2);
  const startY = Math.round(PAD + 90 + (H - PAD * 2 - 90 - totalH) / 2);

  const archAccents = cardAccentColors(p);
  let boxesHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const col = useRows ? (i % cols) : i;
    const row = useRows ? Math.floor(i / cols) : 0;
    const cx = startX + col * (boxW + gapX);
    const cy = startY + row * (boxH + gapY);
    const sep = nodes[i].indexOf(':');
    const title = sep > -1 && sep < 50 ? stripMarkdown(nodes[i].slice(0, sep).trim()) : stripMarkdown(nodes[i]);
    const desc = sep > -1 && sep < 50 ? stripMarkdown(nodes[i].slice(sep + 1).trim()) : '';
    const descMaxH = boxH - 56;
    const titleFSz = boxH >= 140 ? 24 : 20;
    const descFSz = boxH >= 140 ? 18 : 16;
    const nodeColor = archAccents[i % archAccents.length];

    boxesHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${boxW}px;height:${boxH}px;background:${p.surface};border:1px solid ${p.border};border-radius:12px;border-top:4px solid ${nodeColor};box-shadow:${cardShadow(2, isDarkBackground(p.background))};overflow:hidden"></div>`;
    boxesHtml += `<div style="position:absolute;left:${cx + 14}px;top:${cy + (desc ? 14 : Math.round(boxH / 2 - 10))}px;width:${boxW - 28}px;text-align:center;font-size:${titleFSz}px;font-weight:bold;color:${nodeColor};overflow:hidden;max-height:38px;line-height:1.3">${escHtml(title)}</div>`;
    if (desc) {
      boxesHtml += `<div style="position:absolute;left:${cx + 14}px;top:${cy + 42}px;width:${boxW - 28}px;text-align:center;font-size:${descFSz}px;color:${p.text};opacity:0.7;line-height:1.4;overflow:hidden;max-height:${descMaxH}px">${escHtml(desc)}</div>`;
    }

    // Horizontal connector arrows within same row
    if (!useRows && i < count - 1) {
      const x1 = cx + boxW + 2;
      const x2 = cx + boxW + gapX - 2;
      const ay = cy + boxH / 2;
      connectorsSvg += `<line x1="${x1}" y1="${ay}" x2="${x2}" y2="${ay}" stroke="${p.border}" stroke-width="2" marker-end="url(#arch-arrow)" />`;
    }
    if (useRows && col < cols - 1 && i + 1 < count && Math.floor((i + 1) / cols) === row) {
      const x1 = cx + boxW + 2;
      const x2 = cx + boxW + gapX - 2;
      const ay = cy + boxH / 2;
      connectorsSvg += `<line x1="${x1}" y1="${ay}" x2="${x2}" y2="${ay}" stroke="${p.border}" stroke-width="2" marker-end="url(#arch-arrow)" />`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${boxesHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" /></marker></defs>
    ${connectorsSvg}
  </svg>
</div>`;
}
