/**
 * Figma-grade HTML+SVG slide templates for complex slide types.
 *
 * These 32 types produce superior visuals via absolute-positioned HTML+SVG
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
  logoUrl?: string;
}

// ── Constants ────────────────────────────────────────────────

const PAD = 53;       // 40 * (1280/960)
const W = 1280;
const H = 720;

// Slide types that use Figma-grade HTML+SVG templates for superior visuals.
export const FIGMA_GRADE_TYPES: Set<string> = new Set([
  'COMPARISON', 'TIMELINE', 'METRICS_HIGHLIGHT', 'DATA_METRICS', 'MARKET_SIZING', 'TEAM',
  'FEATURE_GRID', 'PROCESS', 'PROBLEM', 'SOLUTION', 'CTA', 'CONTENT', 'QUOTE', 'ARCHITECTURE',
  'HOOK', 'MATRIX_2X2', 'WATERFALL', 'FUNNEL', 'COMPETITIVE_MATRIX', 'ROADMAP',
  'PRICING_TABLE', 'UNIT_ECONOMICS', 'SWOT', 'THREE_PILLARS', 'BEFORE_AFTER',
  'SOCIAL_PROOF', 'OBJECTION_HANDLER', 'FAQ', 'VERDICT', 'COHORT_TABLE', 'PROGRESS_TRACKER',
  'PRODUCT_SHOWCASE', 'SPLIT_STATEMENT', 'HIRING_PLAN', 'USE_OF_FUNDS', 'RISK_MITIGATION', 'DEMO_SCREENSHOT', 'MILESTONE_TIMELINE', 'PARTNERSHIP_LOGOS',
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
    .replace(/^#{1,3}\s+/, '')
    .replace(/\*/g, '');
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


function titleFontSize(title: string, maxFontSize = 40): number {
  if (title.length <= 25) return maxFontSize;
  if (title.length <= 40) return 34;
  if (title.length <= 55) return 30;
  if (title.length <= 75) return 26;
  return 22;
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

function hexToHue(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return h;
}

// AMI Labs-style ambient glow — 2-3 large soft radial gradient orbs for depth
function bgGradientOverlay(w: number, h: number, color: string, _alpha = 0.05, posY = '35%'): string {
  const posYNum = parseInt(posY) || 35;
  const oppositeY = Math.min(100, Math.max(0, 100 - posYNum));
  // Primary orb: strong glow at specified position (uses 0.15 alpha — in mood replacement list)
  // Secondary orb: softer complementary glow at opposite position (0.08 alpha)
  // Ambient fill: very subtle center glow (0.04 alpha)
  return `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;pointer-events:none;background:` +
    `radial-gradient(ellipse 70% 60% at 20% ${posYNum}%, ${hexToRgba(color, 0.15)} 0%, transparent 55%),` +
    `radial-gradient(ellipse 60% 50% at 80% ${oppositeY}%, ${hexToRgba(color, 0.08)} 0%, transparent 50%),` +
    `radial-gradient(ellipse 90% 80% at 50% 50%, ${hexToRgba(color, 0.04)} 0%, transparent 65%)` +
    `"></div>`;
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
function cardAccentColors(p: ColorPalette, rotateOffset = 0): string[] {
  const base = [p.accent, p.primary, p.secondary, p.success, p.warning, p.error].filter(Boolean);
  if (rotateOffset <= 0 || base.length <= 1) return base;
  const off = rotateOffset % base.length;
  return [...base.slice(off), ...base.slice(0, off)];
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

// Deterministic color rotation offset from title — diversifies accent color placement across slides
function colorOffset(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) {
    h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 5;
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
  let techCount = 0;
  for (const { mood, re } of MOOD_KEYWORDS) {
    re.lastIndex = 0;
    const matches = text.match(re);
    const count = matches ? matches.length : 0;
    // TECH keywords (AI, data, platform…) appear in nearly every slide of a tech deck.
    // Defer TECH — only use it as fallback when no other mood matches.
    if (mood === 'TECH') { techCount = count; continue; }
    if (count >= 1 && count > bestCount) {
      best = mood;
      bestCount = count;
    }
  }
  // TECH only when nothing else matched and has 2+ tech keywords
  if (best === 'NEUTRAL' && techCount >= 2) {
    best = 'TECH';
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

  // Custom mood-specific colors — NOT derived from palette.
  // Palette-derived colors (e.g., TECH→p.primary) looked identical to defaults.
  // These fixed colors create VISIBLE per-slide contrast.
  const moodColorMap: Record<Exclude<ContentMood, 'NEUTRAL'>, { dark: string; light: string }> = {
    GROWTH:   { dark: '#34d399', light: '#059669' },  // emerald — fresh, upward
    RISK:     { dark: '#fb7185', light: '#e11d48' },   // rose — urgent, attention
    TECH:     { dark: '#e879f9', light: '#a21caf' },   // fuchsia — warm, distinct from blue bg
    PEOPLE:   { dark: '#fbbf24', light: '#d97706' },   // amber — warm, human
    STRATEGY: { dark: '#2dd4bf', light: '#0d9488' },   // teal — cool but distinct from blue
  };
  let mc = moodColorMap[mood as Exclude<ContentMood, 'NEUTRAL'>][dark ? 'dark' : 'light'];

  // Color incompatibility check: if mood hue is too close to background hue,
  // the text becomes hard to read. Fall back to a warm complementary color.
  const bgHue = hexToHue(p.background);
  const mcHue = hexToHue(mc);
  const hueDiff = Math.min(Math.abs(bgHue - mcHue), 360 - Math.abs(bgHue - mcHue));
  if (hueDiff < 45) {
    // Too similar hue — swap to a warm fallback that always contrasts with cool backgrounds
    const warmFallbacks: Record<Exclude<ContentMood, 'NEUTRAL'>, { dark: string; light: string }> = {
      GROWTH:   { dark: '#34d399', light: '#059669' },  // emerald (already warm-ish)
      RISK:     { dark: '#fb7185', light: '#e11d48' },   // rose (already warm)
      TECH:     { dark: '#f472b6', light: '#db2777' },   // pink — guaranteed contrast on blue
      PEOPLE:   { dark: '#fbbf24', light: '#d97706' },   // amber (already warm)
      STRATEGY: { dark: '#a3e635', light: '#65a30d' },   // lime — guaranteed contrast on blue
    };
    mc = warmFallbacks[mood as Exclude<ContentMood, 'NEUTRAL'>][dark ? 'dark' : 'light'];
  }

  return {
    titleColor: mc,
    emphasisColor: mc,
    metricColor: mc,
  };
}

// ── Scoped reset injected into every Figma-grade slide ──────

const SCOPED_RESET = `<style scoped>
section { padding: 0 !important; display: block !important; overflow: visible !important; position: relative !important; }
section > * { flex-shrink: unset; }
section::after { position: absolute !important; bottom: 14px !important; right: 20px !important; font-size: 12px !important; z-index: 50 !important; padding: 2px 8px !important; border-radius: 4px !important; color: rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.08) !important; }
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
  options?: { accentColorDiversity?: boolean },
): string {
  // Skip logo types (full-bleed slides where logo would clash)
  const NO_LOGO_TYPES = new Set(['TITLE', 'CTA', 'SECTION_DIVIDER']);

  // Strip markdown from title at entry point; body is passed raw so
  // builders like parseMarkdownTable() can detect **bold** markers.
  const cleaned: SlideInput = {
    ...slide,
    title: stripMarkdown(slide.title),
    body: slide.body,
  };
  const accentDiversity = options?.accentColorDiversity !== false;

  let html = '';
  switch (cleaned.slideType) {
    case 'MARKET_SIZING':
      html = buildMarketSizing(cleaned, palette, !!cleaned.imageUrl); break;
    case 'TIMELINE':
      html = buildTimeline(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'METRICS_HIGHLIGHT':
    case 'DATA_METRICS':
      html = buildMetricsHighlight(cleaned, palette, !!cleaned.imageUrl); break;
    case 'COMPARISON':
      html = buildComparison(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'TEAM':
      html = buildTeam(cleaned, palette, !!cleaned.imageUrl); break;
    case 'FEATURE_GRID':
      html = buildFeatureGrid(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'PROCESS':
      html = buildProcess(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'PROBLEM':
      html = buildProblem(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'SOLUTION':
      html = buildSolution(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'CTA':
      html = buildCta(cleaned, palette, !!cleaned.imageUrl); break;
    case 'CONTENT':
      html = buildContent(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'QUOTE':
      html = buildQuote(cleaned, palette, !!cleaned.imageUrl); break;
    case 'ARCHITECTURE':
      html = buildArchitecture(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'HOOK':
      html = buildHook(cleaned, palette, !!cleaned.imageUrl); break;
    case 'MATRIX_2X2':
      html = buildMatrix2x2(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'WATERFALL':
      html = buildWaterfall(cleaned, palette, !!cleaned.imageUrl); break;
    case 'FUNNEL':
      html = buildFunnel(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'COMPETITIVE_MATRIX':
      html = buildCompetitiveMatrix(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'ROADMAP':
      html = buildRoadmap(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'PRICING_TABLE':
      html = buildPricingTable(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'UNIT_ECONOMICS':
      html = buildUnitEconomics(cleaned, palette, !!cleaned.imageUrl); break;
    case 'SWOT':
      html = buildSwot(cleaned, palette, !!cleaned.imageUrl); break;
    case 'THREE_PILLARS':
      html = buildThreePillars(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'BEFORE_AFTER':
      html = buildBeforeAfter(cleaned, palette, !!cleaned.imageUrl); break;
    case 'SOCIAL_PROOF':
      html = buildSocialProof(cleaned, palette, !!cleaned.imageUrl); break;
    case 'OBJECTION_HANDLER':
      html = buildObjectionHandler(cleaned, palette, !!cleaned.imageUrl); break;
    case 'FAQ':
      html = buildFaq(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'VERDICT':
      html = buildVerdict(cleaned, palette, !!cleaned.imageUrl); break;
    case 'COHORT_TABLE':
      html = buildCohortTable(cleaned, palette, !!cleaned.imageUrl); break;
    case 'PROGRESS_TRACKER':
      html = buildProgressTracker(cleaned, palette, !!cleaned.imageUrl); break;
    case 'PRODUCT_SHOWCASE':
      html = buildProductShowcase(cleaned, palette, !!cleaned.imageUrl); break;
    case 'SPLIT_STATEMENT':
      html = buildSplitStatement(cleaned, palette, !!cleaned.imageUrl); break;
    case 'HIRING_PLAN':
      html = buildHiringPlan(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'USE_OF_FUNDS':
      html = buildUseOfFunds(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'RISK_MITIGATION':
      html = buildRiskMitigation(cleaned, palette, !!cleaned.imageUrl); break;
    case 'DEMO_SCREENSHOT':
      html = buildDemoScreenshot(cleaned, palette, !!cleaned.imageUrl); break;
    case 'MILESTONE_TIMELINE':
      html = buildMilestoneTimeline(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
    case 'PARTNERSHIP_LOGOS':
      html = buildPartnershipLogos(cleaned, palette, !!cleaned.imageUrl, accentDiversity); break;
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

  // Inject company logo on every slide (except TITLE/CTA/SECTION_DIVIDER)
  if (cleaned.logoUrl && html && !NO_LOGO_TYPES.has(cleaned.slideType)) {
    const logoDark = isDarkBackground(palette.background);
    const logoDiv = `<div style="position:absolute;bottom:16px;right:24px;width:40px;height:40px;z-index:10;opacity:0.6"><img src="${cleaned.logoUrl}" style="width:100%;height:100%;object-fit:contain;filter:${logoDark ? 'brightness(1.2)' : 'none'}" /></div>`;
    const closingDivIdx = html.lastIndexOf('</div>');
    if (closingDivIdx > -1) {
      html = html.slice(0, closingDivIdx) + logoDiv + html.slice(closingDivIdx);
    }
  }

  return html;
}

// ── PRODUCT_SHOWCASE ────────────────────────────────────────
// Left: title + accent bar + feature bullets. Right: CSS laptop bezel framing the image.

function buildProductShowcase(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Left panel: title + features (40% width)
  const leftW = Math.round(cW * 0.40);
  const rightX = leftW + 20;
  const rightW = cW - rightX - PAD;

  // Feature bullets — clamp height to prevent spillover
  let featuresHtml = '';
  const featStartY = PAD + 100;
  const maxFeats = Math.min(lines.length, 6);
  const featAvailH = H - featStartY - PAD - 10;
  const featGap = 8;
  const featItemH = Math.min(56, Math.round((featAvailH - (maxFeats - 1) * featGap) / maxFeats));
  const featFontSize = featItemH >= 50 ? 15 : featItemH >= 38 ? 13 : 12;
  for (let i = 0; i < maxFeats; i++) {
    const fy = featStartY + i * (featItemH + featGap);
    featuresHtml += `<div style="position:absolute;left:${PAD + 8}px;top:${fy}px;width:${leftW - 24}px;height:${featItemH}px;font-size:${featFontSize}px;line-height:1.35;color:${p.text};opacity:0.85;overflow:hidden"><span style="color:${p.accent};margin-right:8px;font-weight:bold">&bull;</span>${escHtml(lines[i])}</div>`;
  }

  // Right panel: laptop bezel frame
  const bezelX = rightX;
  const bezelY = PAD + 40;
  const bezelW = rightW;
  const bezelH = H - bezelY - PAD - 30;
  const screenPad = 12;
  const screenX = bezelX + screenPad;
  const screenY = bezelY + 28; // top bar height
  const screenW = bezelW - screenPad * 2;
  const screenH = bezelH - 28 - screenPad;
  const bezelBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const bezelBorder = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  let screenContent = '';
  if (slide.imageUrl) {
    screenContent = `<img src="${slide.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px" />`;
  } else {
    // Placeholder screen with grid pattern
    screenContent = `<div style="width:100%;height:100%;background:${bezelBg};border-radius:4px;display:flex;align-items:center;justify-content:center">
      <div style="font-size:16px;font-weight:bold;color:${p.text};opacity:0.4">${escHtml(slide.title)}</div>
    </div>`;
  }

  const bezelHtml = `<div style="position:absolute;left:${bezelX}px;top:${bezelY}px;width:${bezelW}px;height:${bezelH}px;background:${bezelBg};border:${dark ? '2' : '3'}px solid ${bezelBorder};border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden">
    <div style="height:24px;background:${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};display:flex;align-items:center;padding:0 12px">
      <div style="width:8px;height:8px;border-radius:50%;background:${p.error || '#ef4444'};margin-right:6px;opacity:0.7"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${p.warning || '#eab308'};margin-right:6px;opacity:0.7"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${p.success || '#22c55e'};opacity:0.7"></div>
    </div>
    <div style="padding:${screenPad}px;height:${screenH}px;overflow:hidden">
      ${screenContent}
    </div>
    <div style="position:absolute;bottom:0;left:0;width:100%;height:40px;background:linear-gradient(to bottom,transparent,${hexToRgba(p.background, 0.3)});pointer-events:none"></div>
  </div>`;

  // Stand/base of laptop
  const standHtml = `<div style="position:absolute;left:${bezelX + Math.round(bezelW * 0.3)}px;top:${bezelY + bezelH}px;width:${Math.round(bezelW * 0.4)}px;height:8px;background:${bezelBorder};border-radius:0 0 8px 8px"></div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${leftW}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${featuresHtml}
  ${bezelHtml}
  ${standHtml}
</div>`;
}

// ── SPLIT_STATEMENT ──────────────────────────────────────────
// Evidence/case-study cards: parses --- separated sections with bold headers + stat numbers.
// Format: subtitle line, then "**Header**\n**Stat** description..." sections split by ---

function buildSplitStatement(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const dark = isDarkBackground(p.background);

  // Parse sections: split by --- AND by blank-line + **Bold** patterns
  const roughSections = slide.body.split(/\n---\n|\n-{3,}\n/);
  const splitSections: string[] = [];
  for (const rs of roughSections) {
    const subParts = rs.split(/\n\n(?=\*\*[^*]+\*\*)/);
    for (const sp of subParts) { if (sp.trim()) splitSections.push(sp.trim()); }
  }

  let subtitle = '';
  const sections: Array<{ header: string; stat: string; description: string }> = [];

  for (const trimmed of splitSections) {
    if (!trimmed) continue;

    // Try to extract **Header** and **Stat** + description
    const headerMatch = trimmed.match(/^\*\*([^*]+)\*\*/);
    if (headerMatch) {
      const header = headerMatch[1].trim();
      const rest = trimmed.slice(headerMatch[0].length).trim();
      // Lines after header
      const restLines = rest.split('\n').map(l => l.trim()).filter(Boolean);
      let stat = '';
      let descParts: string[] = [];
      // Extract stat: next bold value or a numeric-heavy first line
      const statMatch = rest.match(/^\*\*([^*]+)\*\*/);
      if (statMatch) {
        stat = statMatch[1].trim();
        const afterStat = rest.slice(statMatch[0].length).trim();
        descParts = afterStat.split('\n').map(l => l.trim()).filter(Boolean);
      } else if (restLines.length > 0 && /^[\d$%,.:+]/.test(restLines[0])) {
        // Extract just the leading numeric token (e.g. "1,000" from "1,000 salespeople...")
        const numMatch = restLines[0].match(/^([\d$%,.+]+(?:\s*[A-Z+]+)?)\s+(.*)/);
        if (numMatch) {
          stat = stripMarkdown(numMatch[1]);
          descParts = [numMatch[2], ...restLines.slice(1)].filter(Boolean);
        } else {
          stat = stripMarkdown(restLines[0]);
          descParts = restLines.slice(1);
        }
      } else {
        descParts = restLines;
      }
      const description = descParts.map(l => stripMarkdown(l)).join(' ').replace(/^of\s+/i, '');
      sections.push({ header, stat, description });
    } else {
      // No bold header — treat as subtitle
      subtitle = stripMarkdown(trimmed).replace(/\n+/g, ' ');
    }
  }

  // If no --- sections found, try line-by-line parsing
  if (sections.length === 0) {
    const lines = parseBodyLines(slide.body);
    for (const line of lines) {
      sections.push({ header: '', stat: '', description: line });
    }
  }

  // Layout: title + subtitle at top, then horizontally arranged evidence cards
  const titleY = PAD;
  const subtitleY = titleY + 52;
  const cardStartY = subtitle ? subtitleY + 40 : titleY + 70;
  const cardAvailH = H - cardStartY - PAD - 10;
  const cardGap = 16;
  const numCards = Math.min(sections.length, 4);
  const cardW = Math.floor((cW - PAD * 2 - (numCards - 1) * cardGap) / numCards) - 2;
  const cardH = Math.min(cardAvailH, 380);
  const cardBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.025)';
  const cardBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const accentColors = cardAccentColors(p, colorOffset(slide.title));

  let cardsHtml = '';
  for (let i = 0; i < numCards; i++) {
    const s = sections[i];
    const cx = PAD + i * (cardW + cardGap);
    const accent = accentColors[i % accentColors.length];

    // Card container
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cardStartY}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;border-top:4px solid ${hexToRgba(accent, 0.8)};overflow:hidden"></div>`;

    // Header label
    if (s.header) {
      cardsHtml += `<div style="position:absolute;left:${cx + 20}px;top:${cardStartY + 20}px;width:${cardW - 40}px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(s.header)}</div>`;
    }

    // Stat number (big)
    const statY = cardStartY + (s.header ? 50 : 20);
    if (s.stat) {
      const statFontSize = s.stat.length > 12 ? 28 : s.stat.length > 6 ? 36 : 44;
      cardsHtml += `<div style="position:absolute;left:${cx + 20}px;top:${statY}px;width:${cardW - 40}px;font-size:${statFontSize}px;font-weight:bold;color:${p.text};line-height:1.1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(s.stat)}</div>`;
    }

    // Description
    const descY = s.stat ? statY + (s.stat.length > 12 ? 38 : s.stat.length > 6 ? 46 : 54) : statY;
    const descAvailH = cardH - (descY - cardStartY) - 16;
    if (s.description) {
      cardsHtml += `<div style="position:absolute;left:${cx + 20}px;top:${descY}px;width:${cardW - 40}px;max-height:${descAvailH}px;font-size:14px;line-height:1.5;color:${p.text};opacity:0.75;overflow:hidden">${escHtml(s.description)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${titleY}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;color:${p.text};line-height:1.2;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${titleY + 48}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${subtitle ? `<div style="position:absolute;left:${PAD}px;top:${subtitleY}px;width:${cW - PAD * 2}px;font-size:16px;color:${p.text};opacity:0.65;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(subtitle)}</div>` : ''}
  ${cardsHtml}
</div>`;
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

  // Parse lines into label:value pairs for better display
  const parsedLines = lines.slice(0, 5).map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1 && sep < 40) return { label: stripMarkdown(line.slice(0, sep).trim()), value: stripMarkdown(line.slice(sep + 1).trim()) };
    return { label: '', value: stripMarkdown(line) };
  });
  const textColW = Math.round(cW * 0.38);
  const lineSpacing = Math.min(60, Math.round((H - PAD * 2 - 80) / Math.max(parsedLines.length, 1)));
  let bodyHtml = '';
  let ty = PAD + 80;
  for (const item of parsedLines) {
    if (item.label) {
      bodyHtml += `<div style="position:absolute;left:${PAD}px;top:${ty}px;width:${textColW}px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${p.accent};opacity:0.7">${escHtml(item.label)}</div>`;
      bodyHtml += `<div style="position:absolute;left:${PAD}px;top:${ty + 18}px;width:${textColW}px;font-size:18px;line-height:1.35;color:${p.text};opacity:0.9;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(item.value)}</div>`;
    } else {
      bodyHtml += `<div style="position:absolute;left:${PAD}px;top:${ty}px;width:${textColW}px;font-size:17px;line-height:1.4;color:${p.text};opacity:0.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(item.value)}</div>`;
    }
    ty += lineSpacing;
  }

  const circlesSvg = circles.map((c) =>
    `<circle cx="${cx}" cy="${cy}" r="${c.r}" fill="${p.primary}" opacity="${c.opacity}" />`
  ).join('');

  const labelsSvg = labelOffsets.map((l) =>
    `<text x="${cx}" y="${cy + l.dy}" text-anchor="middle" fill="${p.primary}" font-size="14" font-weight="bold" letter-spacing="2">${l.label}</text>`
  ).join('');

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${Math.round(cW * 0.45)}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${bodyHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${circlesSvg}
    ${labelsSvg}
  </svg>
</div>`;
}

// ── TIMELINE ─────────────────────────────────────────────────
// Horizontal connector line + circle nodes at computed positions

function buildTimeline(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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
    const zigEndX = cW - PAD - 60;
    const zigSpacing = (zigEndX - zigStartX) / (count - 1 || 1);
    const zigCardW = Math.min(200, Math.round(zigSpacing - 16));
    const zigCardH = 130;
    const zigAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden;">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlowCss}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${zigSvg}
  </svg>
  ${zigHtml}
</div>`;
  }

  const visibleW = cW;
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

  const tlAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden;">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
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
    const firstLine = lines[0].trim();
    // Split on colon to separate value from label (e.g. "250,000: hours saved")
    const colonIdx = firstLine.indexOf(':');
    if (colonIdx > 0 && colonIdx < 20) {
      bigValue = firstLine.substring(0, colonIdx).trim();
      bigLabel = firstLine.substring(colonIdx + 1).trim();
      supportLines = lines.slice(1);
    } else {
      // No colon — extract leading number as hero, rest as label
      // Matches: "$4.2B", "1,000", "250,000", "98%", "€12M"
      const numMatch = firstLine.match(/^([\d$€£¥][\d,.]*[BMKTbmkt%+×x]*)\s*(.*)/);
      if (numMatch && numMatch[1].length >= 2) {
        bigValue = numMatch[1];
        bigLabel = numMatch[2] || '';
        supportLines = lines.slice(1);
      } else {
        bigValue = firstLine;
        if (lines.length > 1) {
          bigLabel = lines[1].trim();
          supportLines = lines.slice(2);
        } else {
          supportLines = [];
        }
      }
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

  // Truncate hero value to keep font large and centered
  if (bigValue.length > 20) bigValue = bigValue.substring(0, 20);
  // Auto-scale hero font: short metrics get 80px, long titles scale down
  const heroFontSize = bigValue.length <= 8 ? 80
    : bigValue.length <= 15 ? 64
    : 48;
  const heroY = Math.round(H * 0.18);
  const supportText = supportLines.join(' ');

  // Secondary metrics: look for lines with "value: label" or "value - label" pattern
  let secondaryHtml = '';
  const metricLines = supportLines.filter((l) => /^[\d$€£¥]/.test(l.trim()) || /%/.test(l));
  const nonMetricLines = supportLines.filter((l) => !metricLines.includes(l));

  if (metricLines.length >= 2) {
    const totalMetrics = Math.min(metricLines.length, 4);
    // 2x2 grid for 4 metrics, single row for 2-3
    const perRow = totalMetrics === 4 ? 2 : totalMetrics;
    const rows = totalMetrics === 4 ? 2 : 1;
    const secY = Math.round(H * (rows === 2 ? 0.62 : 0.72));
    const rowGap = rows === 2 ? 80 : 0;
    const colW = Math.round((cW - PAD * 2 - 120) / perRow);
    const valFontSize = totalMetrics >= 4 ? 24 : 28;
    const labelFontSize2 = totalMetrics >= 4 ? 12 : 13;
    for (let i = 0; i < totalMetrics; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = PAD + 60 + col * colW;
      const cy = secY + row * rowGap;
      const parts = metricLines[i].split(/[:\-–—]/);
      const val = parts[0].trim();
      const label = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
      secondaryHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${colW}px;text-align:center">
        <div style="font-size:${valFontSize}px;font-weight:bold;color:${p.primary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(val)}</div>
        ${label ? `<div style="font-size:${labelFontSize2}px;color:${p.text};opacity:0.65;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(label)}</div>` : ''}
        <div style="width:${Math.round(colW * 0.5)}px;height:3px;background:${hexToRgba(p.border, 0.3)};border-radius:2px;margin:6px auto 0"><div style="width:60%;height:100%;background:${p.accent};border-radius:2px;opacity:0.7"></div></div>
      </div>`;
    }
  }

  // Chart mode: detect 3+ consecutive "label: numericValue" lines
  // Body prefix [line] or [bar] forces chart type; default: line for 5+, bar for 2-4
  const rawBodyLines = slide.body.split('\n').map((l) => l.replace(/^[-\u2022*\u2192\u25ba\u25b8\u279c]\s*/, '').trim()).filter(Boolean);
  const chartTypePrefix = rawBodyLines.length > 0 && /^\[(line|bar)\]/i.test(rawBodyLines[0])
    ? rawBodyLines[0].match(/^\[(line|bar)\]/i)![1].toLowerCase() as 'line' | 'bar'
    : null;
  const chartLines = chartTypePrefix ? rawBodyLines.slice(1) : rawBodyLines;
  const chartData = parseChartData(chartLines);

  if (chartData && metricLines.length < 2) {
    const chartType = chartTypePrefix || (chartData.length >= 5 ? 'line' : 'bar');
    const chartX = PAD + 60;
    const chartYPos = Math.round(H * 0.35);
    const chartW = cW - PAD * 2 - 120;
    const chartH = Math.round(H * 0.45);

    let chartSvg = `<svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
    if (chartType === 'line') {
      chartSvg += generateLineChartSVG(chartData, chartX, chartYPos, chartW, chartH, p);
    } else {
      chartSvg += generateBarChartSVG(chartData, chartX, chartYPos, chartW, chartH, p);
    }
    chartSvg += '</svg>';
    secondaryHtml += chartSvg;
  }

  // Multi-circle mode: when supportLines contain 2-4 percentage values,
  // render a horizontal row of donut charts below the hero metric
  const pctSupportLines = supportLines.filter((l) => /^\d+(\.\d+)?\s*%/.test(l.trim()));
  if (pctSupportLines.length >= 2 && pctSupportLines.length <= 4 && metricLines.length < 2) {
    const circleCount = Math.min(pctSupportLines.length, 4);
    const circleR = 50;
    const circleStroke = 5;
    const circleGap = 40;
    const totalCirclesW = circleCount * (circleR * 2 + circleStroke * 2) + (circleCount - 1) * circleGap;
    const circlesStartX = Math.round((cW - totalCirclesW) / 2);
    const circlesY = Math.round(H * 0.62);
    const circleSvgH = (circleR + circleStroke + 2) * 2 + 30;

    let multiCircleSvg = `<svg style="position:absolute;left:0;top:${circlesY}px" width="${cW}" height="${circleSvgH}" xmlns="http://www.w3.org/2000/svg">`;
    for (let ci = 0; ci < circleCount; ci++) {
      const line = pctSupportLines[ci].trim();
      const pctM = line.match(/(\d+(?:\.\d+)?)\s*%/);
      const pct = pctM ? parseFloat(pctM[1]) : 0;
      const label = line.replace(pctM ? pctM[0] : '', '').replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
      const cxPos = circlesStartX + ci * (circleR * 2 + circleStroke * 2 + circleGap) + circleR + circleStroke;
      const cyPos = circleR + circleStroke + 2;
      multiCircleSvg += generatePercentageCircleSVG(pct, cxPos, cyPos, circleR, circleStroke, p.accent, p.border);
      multiCircleSvg += `<text x="${cxPos}" y="${cyPos + 5}" text-anchor="middle" fill="${p.primary}" font-size="18" font-weight="bold">${Math.round(pct)}%</text>`;
      if (label) {
        multiCircleSvg += `<text x="${cxPos}" y="${cyPos + circleR + circleStroke + 18}" text-anchor="middle" fill="${p.text}" font-size="12" opacity="0.7">${escHtml(label.slice(0, 20))}</text>`;
      }
    }
    multiCircleSvg += '</svg>';
    secondaryHtml += multiCircleSvg;
  }

  // When secondary metrics are shown, skip support text to prevent stacking
  const displaySupport = metricLines.length >= 2 ? '' : (nonMetricLines.length > 0 ? nonMetricLines.join(' ') : supportText);

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
    const svgLeft = centerX - svgCx;
    const svgTop = textCenterY - svgCy;

    circleSvg = `<svg style="position:absolute;left:${svgLeft}px;top:${svgTop}px" width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">
      ${generatePercentageCircleSVG(pctValue, svgCx, svgCy, ringR, ringStroke, p.accent, p.border)}
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
  <div style="position:absolute;left:0;top:${heroY}px;width:${cW}px;text-align:center;font-size:${heroFontSize}px;font-weight:bold;color:${p.primary};line-height:1.1;z-index:2${isDarkBackground(p.background) ? `;${textGlow(p.primary, 0.4)}` : ''}">${escHtml(bigValue)}</div>
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

// ── Reusable SVG Percentage Circle ──────────────────────────
// Generates a donut-style progress ring SVG for percentage values.
// Used by buildMetricsHighlight for single-hero and multi-circle modes.

function generatePercentageCircleSVG(
  pctValue: number,
  cx: number,
  cy: number,
  radius: number,
  strokeWidth: number,
  accentColor: string,
  borderColor: string,
): string {
  const circumference = Math.round(2 * Math.PI * radius);
  const dashOffset = Math.round(circumference * (1 - Math.min(pctValue, 100) / 100));
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${hexToRgba(accentColor, 0.03)}" stroke="${hexToRgba(borderColor, 0.12)}" stroke-width="${strokeWidth}" />` +
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${accentColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${cx} ${cy})" opacity="0.65" />`;
}

// ── Chart SVG Utilities ──────────────────────────────────────

interface ChartDataPoint {
  label: string;
  value: number;
}

function formatChartValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  if (v % 1 !== 0) return v.toFixed(1);
  return String(v);
}

function generateLineChartSVG(
  data: ChartDataPoint[],
  chartX: number,
  chartY: number,
  chartW: number,
  chartH: number,
  palette: ColorPalette,
): string {
  if (data.length < 2) return '';
  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const padded = range * 0.1;
  const yMin = minV - padded;
  const yMax = maxV + padded;
  const yRange = yMax - yMin || 1;

  let svg = '';

  // Grid lines (4 horizontal)
  for (let g = 0; g <= 4; g++) {
    const gy = chartY + chartH - (g / 4) * chartH;
    const gVal = yMin + (g / 4) * yRange;
    svg += `<line x1="${chartX}" y1="${Math.round(gy)}" x2="${chartX + chartW}" y2="${Math.round(gy)}" stroke="${hexToRgba(palette.border, 0.15)}" stroke-width="1" stroke-dasharray="4,4" />`;
    svg += `<text x="${chartX - 8}" y="${Math.round(gy + 4)}" text-anchor="end" fill="${palette.text}" font-size="10" opacity="0.5">${formatChartValue(gVal)}</text>`;
  }

  // Data points + polyline
  const points: string[] = [];
  const areaPoints: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const px = chartX + (i / (data.length - 1)) * chartW;
    const py = chartY + chartH - ((data[i].value - yMin) / yRange) * chartH;
    points.push(`${Math.round(px)},${Math.round(py)}`);
    areaPoints.push(`${Math.round(px)},${Math.round(py)}`);
  }

  // Area fill
  const firstX = chartX;
  const lastX = chartX + chartW;
  const bottomY = chartY + chartH;
  svg += `<polygon points="${firstX},${bottomY} ${areaPoints.join(' ')} ${lastX},${bottomY}" fill="${hexToRgba(palette.accent, 0.08)}" />`;

  // Line
  svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />`;

  // Data point circles
  for (let i = 0; i < data.length; i++) {
    const px = chartX + (i / (data.length - 1)) * chartW;
    const py = chartY + chartH - ((data[i].value - yMin) / yRange) * chartH;
    svg += `<circle cx="${Math.round(px)}" cy="${Math.round(py)}" r="4" fill="${palette.accent}" stroke="${palette.background}" stroke-width="2" />`;
  }

  // X-axis labels
  const maxLabels = Math.min(data.length, 8);
  const step = data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels);
  for (let i = 0; i < data.length; i += step) {
    const px = chartX + (i / (data.length - 1)) * chartW;
    svg += `<text x="${Math.round(px)}" y="${chartY + chartH + 16}" text-anchor="middle" fill="${palette.text}" font-size="10" opacity="0.6">${escHtml(data[i].label.slice(0, 10))}</text>`;
  }

  return svg;
}

function generateBarChartSVG(
  data: ChartDataPoint[],
  chartX: number,
  chartY: number,
  chartW: number,
  chartH: number,
  palette: ColorPalette,
): string {
  if (data.length === 0) return '';
  const vals = data.map((d) => d.value);
  const maxV = Math.max(...vals) || 1;
  const barCount = Math.min(data.length, 8);
  const barGap = Math.round(chartW * 0.06);
  const barW = Math.round((chartW - (barCount - 1) * barGap) / barCount);
  const accents = cardAccentColors(palette);

  let svg = '';

  // Grid lines
  for (let g = 0; g <= 4; g++) {
    const gy = chartY + chartH - (g / 4) * chartH;
    const gVal = (g / 4) * maxV;
    svg += `<line x1="${chartX}" y1="${Math.round(gy)}" x2="${chartX + chartW}" y2="${Math.round(gy)}" stroke="${hexToRgba(palette.border, 0.12)}" stroke-width="1" stroke-dasharray="4,4" />`;
    svg += `<text x="${chartX - 8}" y="${Math.round(gy + 4)}" text-anchor="end" fill="${palette.text}" font-size="10" opacity="0.5">${formatChartValue(gVal)}</text>`;
  }

  // Bars
  for (let i = 0; i < barCount; i++) {
    const bx = chartX + i * (barW + barGap);
    const bh = Math.round((data[i].value / maxV) * chartH);
    const by = chartY + chartH - bh;
    const color = accents[i % accents.length];
    svg += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="4" fill="${color}" opacity="0.85" />`;
    // Value label on top
    svg += `<text x="${bx + barW / 2}" y="${by - 6}" text-anchor="middle" fill="${palette.text}" font-size="11" font-weight="bold" opacity="0.8">${formatChartValue(data[i].value)}</text>`;
    // X-axis label
    svg += `<text x="${bx + barW / 2}" y="${chartY + chartH + 16}" text-anchor="middle" fill="${palette.text}" font-size="10" opacity="0.6">${escHtml(data[i].label.slice(0, 10))}</text>`;
  }

  return svg;
}

function parseChartData(lines: string[]): ChartDataPoint[] | null {
  // Detect 3+ consecutive "label: numericValue" lines
  const dataPoints: ChartDataPoint[] = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)[:\s]\s*([\$\u20ac\u00a3]?[\d,]+\.?\d*[BMKTbmkt]?)\s*$/);
    if (m) {
      let val = m[2].replace(/[\$,\u20ac\u00a3]/g, '');
      let multiplier = 1;
      const suffix = val.slice(-1).toUpperCase();
      if (suffix === 'B') { multiplier = 1_000_000_000; val = val.slice(0, -1); }
      else if (suffix === 'M') { multiplier = 1_000_000; val = val.slice(0, -1); }
      else if (suffix === 'K' || suffix === 'T') { multiplier = 1_000; val = val.slice(0, -1); }
      const num = parseFloat(val) * multiplier;
      if (!isNaN(num)) {
        dataPoints.push({ label: m[1].trim(), value: num });
      }
    }
  }
  return dataPoints.length >= 3 ? dataPoints : null;
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
  accentDiversity = true,
): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const count = Math.min(groups.length, 4);
  const gap = 16;
  const cardW = Math.round((cW - PAD * 2 - (count - 1) * gap) / count);
  const cardY = PAD + 80;
  const cardH = H - cardY - PAD;
  const accents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));

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

function buildComparison(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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
    return buildComparisonMultiCard(slide, p, multiGroups, hasImage, accentDiversity);
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
    // Extract optional photo URL from end of line: "Name - Role [https://...]" or "Name - Role https://..."
    const photoMatch = line.match(/\[?(https?:\/\/[^\]\s]+)\]?\s*$/);
    const cleanLine = photoMatch ? line.slice(0, line.indexOf(photoMatch[0])).trim() : line;
    const sep = cleanLine.indexOf(' - ');
    if (sep > -1) return { name: cleanLine.slice(0, sep).trim(), role: cleanLine.slice(sep + 3).trim(), photoUrl: photoMatch ? photoMatch[1] : '' };
    return { name: cleanLine, role: '', photoUrl: photoMatch ? photoMatch[1] : '' };
  });
  const hasAnyPhoto = members.some((m) => m.photoUrl);

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
  const avatarSize = hasAnyPhoto ? 80 : 64;

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

    // Avatar: photo (circular <img>) or initials (SVG circle)
    const avCx = cx + cardW / 2;
    const avCy = cy + 24 + avatarSize / 2;

    if (members[i].photoUrl) {
      // Circular photo via foreignObject
      avatarsSvg += `<foreignObject x="${Math.round(avCx - avatarSize / 2)}" y="${Math.round(avCy - avatarSize / 2)}" width="${avatarSize}" height="${avatarSize}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;overflow:hidden;border:2px solid ${p.accent}"><img src="${members[i].photoUrl}" style="width:100%;height:100%;object-fit:cover" /></div></foreignObject>`;
    } else {
      const initials = members[i].name
        .split(' ')
        .map((w) => w[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
      avatarsSvg += `<circle cx="${Math.round(avCx)}" cy="${Math.round(avCy)}" r="${avatarSize / 2}" fill="${p.primary}" opacity="0.15" />`;
      avatarsSvg += `<text x="${Math.round(avCx)}" y="${Math.round(avCy + 7)}" text-anchor="middle" fill="${p.primary}" font-size="18" font-weight="bold">${escHtml(initials)}</text>`;
    }
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

function buildFeatureGrid(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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
    const fgAccV = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
    return SCOPED_RESET + '\n<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';overflow:hidden">' +
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
    const bentoAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
  const accents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));

  const totalGridW = cols * cardW + (cols - 1) * gapX;
  const gridStartX = Math.round((cW - totalGridW) / 2);
  let html = '';
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gridStartX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);
    const cardColor = accents[i % accents.length];

    html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:${cardShadow(2, isDarkBackground(p.background))};border-top:4px solid ${cardColor}"></div>`;
    // Icon placeholder — uses card accent color
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 20}px;width:32px;height:32px;background:${cardColor};border-radius:8px;opacity:0.8"></div>`;
    // Title (allow 2-line wrap)
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 64}px;width:${cardW - 40}px;font-size:${titleFontSz}px;font-weight:bold;color:${cardColor};overflow:hidden;max-height:40px;line-height:1.3">${escHtml(features[i].title)}</div>`;
    // Description
    if (features[i].desc) {
      html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 100}px;width:${cardW - 40}px;font-size:${descFontSz}px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;max-height:${descMaxH}px;display:-webkit-box;-webkit-line-clamp:${Math.max(2, Math.floor(descMaxH / (descFontSz * 1.4)))};-webkit-box-orient:vertical">${escHtml(features[i].desc)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${html}
</div>`;
}

// ── PROCESS ─────────────────────────────────────────────────
// Numbered step cards with connectors

function buildProcess(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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
    const vtAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
    return SCOPED_RESET + '\n<div style="position:relative;width:' + W + 'px;height:' + H + 'px;background:' + p.background + ';overflow:hidden">' +
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
    const circAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
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
  // Adaptive card width — fits within cW
  const gapX = 24;
  const maxCardW = Math.round((cW - PAD * 2 - (cols - 1) * gapX) / cols);
  const cardW = Math.min(300, maxCardW);
  const gapY = 20;
  const cardY = Math.round(PAD + 90);
  const maxCardH = Math.round((H - cardY - PAD - (rows - 1) * gapY) / rows);
  const cardH = Math.min(useRows ? 220 : (count <= 3 ? 340 : 300), maxCardH);
  const totalW = cols * cardW + (cols - 1) * gapX;
  const startX = Math.round((cW - totalW) / 2);

  const procAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
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


function buildProblem(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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
    // Filter lead sentence, cap items at 4
    let probItems = lines;
    if (lines.length > 2 && lines[0].length > 40 && !/^\d+[.)]/.test(lines[0])) {
      probItems = lines.slice(1);
    }
    const probCap2 = titleCountCap(slide.title);
    const items = probItems.slice(0, Math.min(probCap2 || 4, 4));
    const col1 = items.slice(0, Math.ceil(items.length / 2));
    const col2 = items.slice(Math.ceil(items.length / 2));
    const colW = Math.round((cW - PAD * 2 - 40) / 2);
    const itemStartY = PAD + 110;
    const itemSpacing = Math.min(130, Math.round((H - itemStartY - PAD) / Math.max(col1.length, col2.length)));
    const pAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
    let itemsHtml = '';

    // Render column items with numbered badges
    const renderCol = (col: string[], startX: number, offset: number) => {
      let y = itemStartY;
      for (let i = 0; i < col.length; i++) {
        const ic = pAccents[(i + offset) % pAccents.length];
        itemsHtml += `<div style="position:absolute;left:${startX}px;top:${y + 2}px;width:24px;height:24px;border-radius:50%;background:${hexToRgba(ic, 0.15)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:${ic}">${i + offset + 1}</div>`;
        itemsHtml += `<div style="position:absolute;left:${startX + 32}px;top:${y}px;width:${colW - 32}px;max-height:${itemSpacing - 14}px;font-size:18px;line-height:1.4;color:${p.text};opacity:0.9;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="font-weight:600;color:${ic}">${escHtml(stripMarkdown(col[i]).split(/\s+/).slice(0, 3).join(" "))}</span> ${escHtml(stripMarkdown(col[i]).split(/\s+/).slice(3).join(" "))}</div>`;
        y += itemSpacing;
      }
    };
    renderCol(col1, PAD + 20, 0);
    renderCol(col2, PAD + 20 + colW + 40, col1.length);

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
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;width:${cW - PAD - 44 - 20}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2${titleGlow}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${itemsHtml}
</div>`;
  }

  // Separate lead sentence from bullet items
  let leadLine = '';
  let bulletLines = lines;
  if (lines.length > 2 && lines[0].length > 40 && !/^\d+[.)]/.test(lines[0])) {
    leadLine = lines[0];
    bulletLines = lines.slice(1);
  }

  const probCap = titleCountCap(slide.title);
  const dataLines = bulletLines.slice(0, Math.min(probCap || 4, 4)); // Cap at 4 items max

  // Layout with lead sentence as subtitle
  const leadY = PAD + 80;
  const itemStartY = leadLine ? leadY + 50 : PAD + 100;
  const availH = H - itemStartY - PAD - 10;
  const itemSpacing = Math.min(120, Math.round(availH / dataLines.length));
  const itemMaxH = itemSpacing - 12;
  const itemFontSz = 20;

  const probAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
  let bodyHtml = '';

  // Render lead sentence as a subtitle
  if (leadLine) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${leadY}px;width:${cW - PAD * 2 - 80}px;font-size:16px;line-height:1.5;color:${p.text};opacity:0.65;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(leadLine)}</div>`;
  }

  let ty = itemStartY;
  for (let pi = 0; pi < dataLines.length; pi++) {
    const itemColor = probAccents[pi % probAccents.length];
    // Numbered circle badge + text
    bodyHtml += `<div style="position:absolute;left:${PAD + 20}px;top:${ty + 2}px;width:24px;height:24px;border-radius:50%;background:${hexToRgba(itemColor, 0.15)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:${itemColor}">${pi + 1}</div>`;
    bodyHtml += `<div style="position:absolute;left:${PAD + 52}px;top:${ty}px;width:${cW - PAD * 2 - 100}px;max-height:${itemMaxH}px;font-size:${itemFontSz}px;line-height:1.4;color:${p.text};opacity:0.9;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="font-weight:600;color:${itemColor}">${escHtml(stripMarkdown(dataLines[pi]).split(/\s+/).slice(0, 3).join(" "))}</span> ${escHtml(stripMarkdown(dataLines[pi]).split(/\s+/).slice(3).join(" "))}</div>`;
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
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;width:${cW - PAD - 44 - 20}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── SOLUTION ────────────────────────────────────────────────
// Left accent bar + checkmark icon

function buildSolution(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const barColor = p.success || p.accent;

  const solCap = titleCountCap(slide.title);
  // Filter lead sentence, cap at 5 items
  let solLines = lines;
  if (lines.length > 2 && lines[0].length > 40 && !/^\d+[.)]/.test(lines[0])) {
    solLines = lines.slice(1);
  }
  const solutionItems = solLines.slice(0, Math.min(solCap || 5, 5));
  const solVariant = layoutVariant(slide.title, slide.body, 2);

  // Variant 1: Checkmark cascade — SVG checkmark circles + staircase indent
  if (solVariant === 1 && solutionItems.length >= 2) {
    const dark = isDarkBackground(p.background);
    const cascStartY = PAD + 100;
    const cascAvailH = H - cascStartY - PAD - 10;
    const cascSpacing = Math.min(76, Math.round(cascAvailH / solutionItems.length));
    const cascFontSz = solutionItems.length > 4 ? 14 : 16;
    const cascAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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

  const solAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;width:${cW - PAD - 44 - 20}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── CTA ─────────────────────────────────────────────────────
// Centered action card

function buildCta(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const lines = parseBodyLines(slide.body);
  const cW = hasImage ? CONTENT_W_IMG : W;
  const visibleW = cW;
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

function buildContent(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
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

  const contAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));
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

function buildArchitecture(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const archCap = titleCountCap(slide.title);
  const nodes = lines.slice(0, archCap || 6);

  if (nodes.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = nodes.length;
  const dark = isDarkBackground(p.background);
  const archAccents = cardAccentColors(p, (accentDiversity ? colorOffset(slide.title) : 0));

  // Parse nodes into title:desc pairs
  const parsed = nodes.map((n, i) => {
    const sep = n.indexOf(':');
    const title = sep > -1 && sep < 50 ? stripMarkdown(n.slice(0, sep).trim()) : stripMarkdown(n);
    const desc = sep > -1 && sep < 50 ? stripMarkdown(n.slice(sep + 1).trim()) : '';
    return { title, desc, color: archAccents[i % archAccents.length] };
  });

  // Layered architecture: horizontal bars stacked vertically with vertical connectors
  const titleAreaH = 80;
  const layerStartY = PAD + titleAreaH;
  const connectorH = 20;
  const layerGap = 4;
  const totalConnH = (count - 1) * (connectorH + layerGap);
  const availH = H - PAD - layerStartY - totalConnH;
  const layerH = Math.min(80, Math.max(48, Math.round(availH / count)));
  const accentW = 5;
  const layerW = cW - PAD * 2;
  const layerX = PAD;

  let layersHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const ly = layerStartY + i * (layerH + layerGap + connectorH);
    const { title, desc, color } = parsed[i];

    // Layer background bar
    layersHtml += `<div style="position:absolute;left:${layerX}px;top:${ly}px;width:${layerW}px;height:${layerH}px;background:${p.surface};border:1px solid ${p.border};border-radius:10px;border-left:${accentW}px solid ${color};box-shadow:${cardShadow(1, dark)};overflow:hidden"></div>`;

    // Layer number badge
    const badgeSize = 28;
    const badgeX = layerX + accentW + 12;
    const badgeY = ly + Math.round(layerH / 2 - badgeSize / 2);
    layersHtml += `<div style="position:absolute;left:${badgeX}px;top:${badgeY}px;width:${badgeSize}px;height:${badgeSize}px;border-radius:50%;background:${color};text-align:center;line-height:${badgeSize}px;font-size:13px;font-weight:bold;color:#fff">${i + 1}</div>`;

    // Title
    const titleStartX = badgeX + badgeSize + 10;
    const titleW = desc ? Math.min(Math.round(layerW * 0.30), 260) : layerW - (titleStartX - layerX) - 14;
    const titleFSz = layerH >= 70 ? 18 : 16;
    layersHtml += `<div style="position:absolute;left:${titleStartX}px;top:${ly + Math.round(layerH / 2 - titleFSz * 0.7)}px;width:${titleW}px;font-size:${titleFSz}px;font-weight:bold;color:${color};overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3">${escHtml(title)}</div>`;

    // Description (right side, separated by subtle divider)
    if (desc) {
      const descX = titleStartX + titleW + 20;
      const descW = layerX + layerW - descX - 14;
      const descFSz = layerH >= 70 ? 14 : 13;
      // Vertical separator
      layersHtml += `<div style="position:absolute;left:${descX - 10}px;top:${ly + 10}px;width:1px;height:${layerH - 20}px;background:${hexToRgba(p.border, 0.4)}"></div>`;
      layersHtml += `<div style="position:absolute;left:${descX}px;top:${ly + Math.round(layerH / 2 - descFSz * 0.7)}px;width:${descW}px;font-size:${descFSz}px;color:${p.text};opacity:0.75;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4">${escHtml(desc)}</div>`;
    }

    // Vertical connector arrow to next layer
    if (i < count - 1) {
      const arrowX = Math.round(cW / 2);
      const arrowY1 = ly + layerH + 2;
      const arrowY2 = arrowY1 + layerGap + connectorH - 4;
      connectorsSvg += `<line x1="${arrowX}" y1="${arrowY1}" x2="${arrowX}" y2="${arrowY2}" stroke="${hexToRgba(p.border, 0.5)}" stroke-width="2" marker-end="url(#arch-arrow)" />`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${layersHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" /></marker></defs>
    ${connectorsSvg}
  </svg>
</div>`;
}


// ── HOOK ────────────────────────────────────────────────────
// Opening provocation — single dramatic sentence centered with gradient glow

function buildHook(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Use first body line as the dramatic sentence, or fall back to title
  const hookText = lines.length > 0 ? lines[0] : slide.title;
  const subtitle = lines.length > 1 ? lines[1] : '';

  // Detect provocation symbol
  const hasQuestion = hookText.includes('?') || slide.title.includes('?');
  const decorSymbol = hasQuestion ? '?' : '!';

  // Large decorative symbol at low opacity
  const symbolX = Math.round(cW * 0.5);
  const symbolY = Math.round(H * 0.48);
  const symbolHtml = `<div style="position:absolute;left:${symbolX - 100}px;top:${symbolY - 120}px;width:200px;height:200px;font-size:200px;line-height:200px;text-align:center;color:${p.accent};opacity:0.08;font-weight:900;pointer-events:none">${decorSymbol}</div>`;

  // Centered hook text
  const hookFontSize = hookText.length <= 60 ? 48 : hookText.length <= 100 ? 38 : 30;
  const titleGlowCss = dark ? `;${textGlow(p.accent, 0.3)}` : '';

  // Gradient glow behind text
  const glowHtml = `<div style="position:absolute;left:${Math.round(cW * 0.15)}px;top:${Math.round(H * 0.25)}px;width:${Math.round(cW * 0.7)}px;height:${Math.round(H * 0.5)}px;background:radial-gradient(ellipse at center,${hexToRgba(p.accent, 0.12)} 0%,transparent 70%);pointer-events:none"></div>`;

  const subtitleHtml = subtitle
    ? `<div style="position:absolute;left:${PAD}px;top:${Math.round(H * 0.62)}px;width:${cW - PAD * 2}px;text-align:center;font-size:18px;line-height:1.5;color:${p.text};opacity:0.7">${escHtml(subtitle)}</div>`
    : '';

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '50%')}
  ${symbolHtml}
  ${glowHtml}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <div style="position:absolute;left:${PAD + 20}px;top:${Math.round(H * 0.38)}px;width:${cW - PAD * 2 - 40}px;text-align:center;font-size:${hookFontSize}px;font-weight:bold;line-height:1.3;color:${p.text}${titleGlowCss}">${escHtml(hookText)}</div>
  ${subtitleHtml}
</div>`;
}


// ── MATRIX_2X2 ──────────────────────────────────────────────
// BCG/McKinsey 2x2 quadrant grid with labeled axes

function buildMatrix2x2(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse axis labels from first two lines, quadrant labels, and items
  let xAxisLabel = 'Low \u2192 High';
  let yAxisLabel = 'Low \u2192 High';
  const quadrantLabels: string[] = [];
  const items: { label: string; desc: string; qIdx: number }[] = [];

  for (const line of lines) {
    const axisMatch = line.match(/^(X|Y)\s*[-:]\s*(.+)/i);
    if (axisMatch) {
      if (axisMatch[1].toUpperCase() === 'X') xAxisLabel = axisMatch[2].trim();
      else yAxisLabel = axisMatch[2].trim();
      continue;
    }
    const quadMatch = line.match(/^Q(\d)\s*[-:]\s*(.+)/i);
    if (quadMatch) {
      const qi = parseInt(quadMatch[1], 10) - 1;
      if (qi >= 0 && qi < 4) quadrantLabels[qi] = quadMatch[2].trim();
      continue;
    }
    // Items: "Label: description"
    const sep = line.indexOf(':');
    if (sep > 0 && sep < 40) {
      items.push({ label: line.slice(0, sep).trim(), desc: line.slice(sep + 1).trim(), qIdx: items.length % 4 });
    } else {
      items.push({ label: line.slice(0, 20).trim(), desc: '', qIdx: items.length % 4 });
    }
  }

  // Default quadrant labels
  const defaultLabels = ['Stars', 'Question Marks', 'Cash Cows', 'Dogs'];
  for (let i = 0; i < 4; i++) {
    if (!quadrantLabels[i]) quadrantLabels[i] = defaultLabels[i];
  }

  // Grid layout
  const gridLeft = PAD + 40;
  const gridTop = PAD + 90;
  const gridW = Math.round((cW - PAD * 2 - 60) * 0.92);
  const gridH = H - gridTop - PAD - 30;
  const halfW = Math.round(gridW / 2);
  const halfH = Math.round(gridH / 2);

  // Quadrant backgrounds
  const qColors = [accents[0] || p.accent, accents[1] || p.primary, accents[2] || p.secondary, accents[3] || p.warning];
  let quadHtml = '';
  const qPositions = [
    { x: gridLeft, y: gridTop },                          // Q1: top-left
    { x: gridLeft + halfW, y: gridTop },                   // Q2: top-right
    { x: gridLeft, y: gridTop + halfH },                   // Q3: bottom-left
    { x: gridLeft + halfW, y: gridTop + halfH },           // Q4: bottom-right
  ];

  for (let qi = 0; qi < 4; qi++) {
    const qp = qPositions[qi];
    quadHtml += `<div style="position:absolute;left:${qp.x}px;top:${qp.y}px;width:${halfW}px;height:${halfH}px;background:${hexToRgba(qColors[qi], 0.06)};border:1px solid ${hexToRgba(p.border, 0.2)}"></div>`;
    quadHtml += `<div style="position:absolute;left:${qp.x + 12}px;top:${qp.y + 8}px;width:${halfW - 24}px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${qColors[qi]};opacity:0.8">${escHtml(quadrantLabels[qi])}</div>`;
  }

  // Plot items as circles in quadrants
  let itemsSvg = '';
  for (let i = 0; i < Math.min(items.length, 8); i++) {
    const item = items[i];
    const qp = qPositions[item.qIdx];
    // Pseudo-random position within quadrant
    const hash = (item.label.charCodeAt(0) || 65) + (item.label.charCodeAt(1) || 66);
    const ix = qp.x + 30 + (hash * 7) % (halfW - 60);
    const iy = qp.y + 32 + ((hash * 13) % (halfH - 50));
    const color = qColors[item.qIdx];
    itemsSvg += `<circle cx="${ix}" cy="${iy}" r="18" fill="${hexToRgba(color, 0.25)}" stroke="${color}" stroke-width="2" />`;
    itemsSvg += `<text x="${ix}" y="${iy + 4}" text-anchor="middle" fill="${p.text}" font-size="10" font-weight="bold">${escHtml(item.label.slice(0, 6))}</text>`;
  }

  // Axis labels
  const xLabelHtml = `<div style="position:absolute;left:${gridLeft}px;top:${gridTop + gridH + 6}px;width:${gridW}px;text-align:center;font-size:12px;color:${p.text};opacity:0.6">${escHtml(xAxisLabel)}</div>`;
  const yLabelHtml = `<div style="position:absolute;left:${gridLeft - 30}px;top:${gridTop}px;width:${gridH}px;font-size:12px;color:${p.text};opacity:0.6;transform:rotate(-90deg);transform-origin:0 0;white-space:nowrap">${escHtml(yAxisLabel)}</div>`;

  // Axis lines SVG
  const axesSvg = `<line x1="${gridLeft}" y1="${gridTop + halfH}" x2="${gridLeft + gridW}" y2="${gridTop + halfH}" stroke="${p.border}" stroke-width="2" opacity="0.4" />` +
    `<line x1="${gridLeft + halfW}" y1="${gridTop}" x2="${gridLeft + halfW}" y2="${gridTop + gridH}" stroke="${p.border}" stroke-width="2" opacity="0.4" />`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${quadHtml}
  ${xLabelHtml}
  ${yLabelHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${axesSvg}
    ${itemsSvg}
  </svg>
</div>`;
}


// ── WATERFALL ───────────────────────────────────────────────
// Waterfall chart with positive (green), negative (red), total (gray) bars

function buildWaterfall(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Parse "Label: +$XXM" or "Label: -$XXM" or "Label: $XXM (total)"
  const entries: { label: string; value: number; isTotal: boolean }[] = [];
  for (const line of lines.slice(0, 8)) {
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    const label = line.slice(0, sep).trim();
    const valStr = line.slice(sep + 1).trim();
    const numMatch = valStr.match(/([+-]?)\s*\$?([\d,.]+)/);
    if (!numMatch) continue;
    const sign = numMatch[1] === '-' ? -1 : 1;
    const num = parseFloat(numMatch[2].replace(/,/g, '')) * sign;
    const isTotal = /total|net|sum|result/i.test(label) || /total/i.test(valStr);
    entries.push({ label, value: num, isTotal });
  }

  if (entries.length === 0) {
    // Fallback: simple lines
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      entries.push({ label: `Item ${i + 1}`, value: (6 - i) * 10 * (i % 3 === 2 ? -1 : 1), isTotal: false });
    }
  }

  const count = entries.length;
  const chartLeft = PAD + 10;
  const chartRight = cW - PAD - 10;
  const chartTop = PAD + 100;
  const chartBottom = H - PAD - 40;
  const chartH = chartBottom - chartTop;
  const barTotalW = chartRight - chartLeft;
  const barW = Math.min(80, Math.round(barTotalW / count - 12));
  const gap = Math.round((barTotalW - barW * count) / (count + 1));

  // Calculate running total for waterfall positioning
  const maxAbs = Math.max(...entries.map(e => Math.abs(e.value)), 1);
  const baselineY = chartTop + Math.round(chartH * 0.55); // baseline slightly below center
  const scale = (chartH * 0.45) / maxAbs;

  let runningTotal = 0;
  let barsSvg = '';
  let labelsHtml = '';
  let connectorsSvg = '';
  let prevTopY = baselineY;

  for (let i = 0; i < count; i++) {
    const e = entries[i];
    const bx = chartLeft + gap + i * (barW + gap);

    let barTop: number;
    let barH: number;
    let color: string;

    if (e.isTotal) {
      // Total bar from baseline
      const totalH = Math.round(Math.abs(runningTotal) * scale);
      barTop = runningTotal >= 0 ? baselineY - totalH : baselineY;
      barH = Math.max(totalH, 4);
      color = p.border;
    } else {
      const valH = Math.round(Math.abs(e.value) * scale);
      if (e.value >= 0) {
        barTop = baselineY - Math.round(runningTotal * scale) - valH;
        barH = Math.max(valH, 4);
        color = p.success || '#22c55e';
      } else {
        barTop = baselineY - Math.round(runningTotal * scale);
        barH = Math.max(valH, 4);
        color = p.error || '#ef4444';
      }
      runningTotal += e.value;
    }

    // Bar
    barsSvg += `<rect x="${bx}" y="${barTop}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity="0.85" />`;

    // Value label above bar
    const valLabel = e.value >= 0 ? `+${Math.abs(e.value)}` : `${e.value}`;
    barsSvg += `<text x="${bx + barW / 2}" y="${barTop - 6}" text-anchor="middle" fill="${p.text}" font-size="11" font-weight="bold">${escHtml(valLabel)}</text>`;

    // Connector line to next bar
    if (i < count - 1 && !e.isTotal) {
      const connY = e.value >= 0 ? barTop : barTop + barH;
      const nextBx = chartLeft + gap + (i + 1) * (barW + gap);
      connectorsSvg += `<line x1="${bx + barW}" y1="${connY}" x2="${nextBx}" y2="${connY}" stroke="${hexToRgba(p.border, 0.4)}" stroke-width="1" stroke-dasharray="4,3" />`;
    }

    // Label below
    labelsHtml += `<div style="position:absolute;left:${bx - 4}px;top:${chartBottom + 6}px;width:${barW + 8}px;text-align:center;font-size:10px;color:${p.text};opacity:0.7;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(e.label)}</div>`;

    prevTopY = barTop;
  }

  // Baseline
  barsSvg += `<line x1="${chartLeft}" y1="${baselineY}" x2="${chartRight}" y2="${baselineY}" stroke="${hexToRgba(p.border, 0.3)}" stroke-width="1" />`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${labelsHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${barsSvg}
    ${connectorsSvg}
  </svg>
</div>`;
}


// ── FUNNEL ──────────────────────────────────────────────────
// Conversion funnel with stacking trapezoids

function buildFunnel(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse "Stage Name: 10,000 (100%)" or just "Stage Name"
  const stages: { name: string; value: string; pct: string }[] = [];
  for (const line of lines.slice(0, 6)) {
    const sep = line.indexOf(':');
    if (sep > 0 && sep < 40) {
      const name = line.slice(0, sep).trim();
      const rest = line.slice(sep + 1).trim();
      const pctMatch = rest.match(/\((\d+%?)\)/);
      stages.push({ name, value: rest.replace(/\(.*?\)/, '').trim(), pct: pctMatch ? pctMatch[1] : '' });
    } else {
      stages.push({ name: line.trim(), value: '', pct: '' });
    }
  }

  if (stages.length === 0) {
    stages.push({ name: 'Awareness', value: '10,000', pct: '100%' });
    stages.push({ name: 'Interest', value: '5,000', pct: '50%' });
    stages.push({ name: 'Decision', value: '1,000', pct: '10%' });
    stages.push({ name: 'Action', value: '200', pct: '2%' });
  }

  const count = stages.length;
  const funnelTop = PAD + 90;
  const funnelBottom = H - PAD - 10;
  const funnelH = funnelBottom - funnelTop;
  const segH = Math.round(funnelH / count);
  const maxWidth = Math.round((cW - PAD * 2) * 0.6);
  const minWidth = Math.round(maxWidth * 0.25);
  const centerX = Math.round(cW * 0.38);

  let funnelSvg = '';
  let labelsHtml = '';

  for (let i = 0; i < count; i++) {
    const topW = maxWidth - Math.round((maxWidth - minWidth) * (i / count));
    const botW = maxWidth - Math.round((maxWidth - minWidth) * ((i + 1) / count));
    const ty = funnelTop + i * segH;
    const by = ty + segH;

    const x1 = centerX - Math.round(topW / 2);
    const x2 = centerX + Math.round(topW / 2);
    const x3 = centerX + Math.round(botW / 2);
    const x4 = centerX - Math.round(botW / 2);

    const color = accents[i % accents.length];
    funnelSvg += `<polygon points="${x1},${ty} ${x2},${ty} ${x3},${by} ${x4},${by}" fill="${hexToRgba(color, 0.7)}" stroke="${hexToRgba(color, 0.9)}" stroke-width="1" />`;

    // Stage label on the right
    const labelX = centerX + Math.round(topW / 2) + 20;
    const labelY = ty + Math.round(segH / 2);
    labelsHtml += `<div style="position:absolute;left:${labelX}px;top:${labelY - 18}px;width:${cW - labelX - PAD}px">`;
    labelsHtml += `<div style="font-size:14px;font-weight:bold;color:${color}">${escHtml(stages[i].name)}</div>`;
    if (stages[i].value) {
      labelsHtml += `<div style="font-size:12px;color:${p.text};opacity:0.7">${escHtml(stages[i].value)}${stages[i].pct ? ' (' + escHtml(stages[i].pct) + ')' : ''}</div>`;
    }
    labelsHtml += `</div>`;

    // Stage name inside funnel
    funnelSvg += `<text x="${centerX}" y="${ty + segH / 2 + 4}" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">${escHtml(stages[i].name.slice(0, 15))}</text>`;

    // Conversion rate between stages
    if (i < count - 1 && stages[i + 1].pct) {
      labelsHtml += `<div style="position:absolute;left:${labelX - 10}px;top:${by - 6}px;font-size:10px;color:${p.text};opacity:0.5">\u2193 ${escHtml(stages[i + 1].pct)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${labelsHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${funnelSvg}
  </svg>
</div>`;
}


// ── COMPETITIVE_MATRIX ──────────────────────────────────────
// Feature comparison table with checkmarks and crosses

function buildCompetitiveMatrix(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Parse: first line = company names, rest = feature rows
  // Format: "Feature: Company1=yes, Company2=no" or pipe-delimited
  const companies: string[] = [];
  const features: { name: string; vals: boolean[] }[] = [];

  for (const line of lines) {
    // Try pipe-delimited: "Feature | Yes | No | Yes"
    const parts = line.split(/\s*\|\s*/).filter(Boolean);
    if (parts.length >= 3 && companies.length === 0 && !/=/.test(line)) {
      // First pipe line with 3+ parts = header row (company names)
      for (let i = 1; i < parts.length; i++) companies.push(parts[i]);
      continue;
    }
    if (parts.length >= 3 && companies.length > 0) {
      const vals = parts.slice(1).map(v => /yes|true|\u2713|check/i.test(v));
      features.push({ name: parts[0], vals });
      continue;
    }
    // Try "Feature: Co1=yes, Co2=no"
    const sep = line.indexOf(':');
    if (sep > 0) {
      const fName = line.slice(0, sep).trim();
      const valStr = line.slice(sep + 1).trim();
      const pairs = valStr.split(/,\s*/);
      if (companies.length === 0) {
        for (const pair of pairs) {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) companies.push(pair.slice(0, eqIdx).trim());
        }
      }
      const vals = pairs.map(pair => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) return /yes|true|\u2713/i.test(pair.slice(eqIdx + 1));
        return /yes|true|\u2713/i.test(pair);
      });
      features.push({ name: fName, vals });
    }
  }

  // Defaults if parsing yields nothing
  if (companies.length === 0) companies.push('Us', 'Comp A', 'Comp B');
  if (features.length === 0) {
    features.push({ name: 'Feature 1', vals: [true, false, true] });
    features.push({ name: 'Feature 2', vals: [true, true, false] });
  }

  const colCount = companies.length + 1; // +1 for feature name col
  const tableLeft = PAD + 10;
  const tableTop = PAD + 90;
  const tableW = cW - PAD * 2 - 20;
  const colW = Math.round(tableW / colCount);
  const featureColW = Math.round(tableW * 0.3);
  const dataColW = Math.round((tableW - featureColW) / companies.length);
  const rowH = Math.min(50, Math.round((H - tableTop - PAD) / (features.length + 1)));

  let tableHtml = '';

  // Header row
  const headerY = tableTop;
  tableHtml += `<div style="position:absolute;left:${tableLeft}px;top:${headerY}px;width:${featureColW}px;height:${rowH}px;background:${hexToRgba(p.surface, 0.3)};border-bottom:2px solid ${p.border};display:flex;align-items:center;padding-left:12px;font-size:12px;font-weight:bold;color:${p.text};opacity:0.6">Feature</div>`;
  for (let ci = 0; ci < companies.length; ci++) {
    const cx = tableLeft + featureColW + ci * dataColW;
    const isOurs = ci === 0;
    const bgColor = isOurs ? hexToRgba(p.accent, 0.12) : hexToRgba(p.surface, 0.3);
    tableHtml += `<div style="position:absolute;left:${cx}px;top:${headerY}px;width:${dataColW}px;height:${rowH}px;background:${bgColor};border-bottom:2px solid ${p.border};text-align:center;line-height:${rowH}px;font-size:13px;font-weight:bold;color:${isOurs ? p.accent : p.text}">${escHtml(companies[ci])}</div>`;
  }

  // Feature rows
  for (let ri = 0; ri < features.length; ri++) {
    const ry = tableTop + (ri + 1) * rowH;
    const f = features[ri];
    const rowBg = ri % 2 === 0 ? 'transparent' : hexToRgba(p.surface, 0.15);

    tableHtml += `<div style="position:absolute;left:${tableLeft}px;top:${ry}px;width:${featureColW}px;height:${rowH}px;background:${rowBg};border-bottom:1px solid ${hexToRgba(p.border, 0.2)};line-height:${rowH}px;padding-left:12px;font-size:13px;color:${p.text}">${escHtml(f.name)}</div>`;

    for (let ci = 0; ci < companies.length; ci++) {
      const cx = tableLeft + featureColW + ci * dataColW;
      const isOurs = ci === 0;
      const cellBg = isOurs ? hexToRgba(p.accent, 0.06) : rowBg;
      const hasFeature = ci < f.vals.length ? f.vals[ci] : false;
      const symbol = hasFeature ? '\u2713' : '\u2717';
      const symColor = hasFeature ? (p.success || '#22c55e') : (p.error || '#ef4444');

      tableHtml += `<div style="position:absolute;left:${cx}px;top:${ry}px;width:${dataColW}px;height:${rowH}px;background:${cellBg};border-bottom:1px solid ${hexToRgba(p.border, 0.2)};text-align:center;line-height:${rowH}px;font-size:18px;font-weight:bold;color:${symColor}">${symbol}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${tableHtml}
</div>`;
}


// ── ROADMAP ─────────────────────────────────────────────────
// Now/Next/Later 3-column lane layout

function buildRoadmap(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse lines into Now/Next/Later buckets
  const lanes: { label: string; items: string[] }[] = [
    { label: 'Now', items: [] },
    { label: 'Next', items: [] },
    { label: 'Later', items: [] },
  ];

  let currentLane = -1;
  for (const line of lines) {
    const laneMatch = line.match(/^(Now|Next|Later)\s*[-:]?\s*(.*)/i);
    if (laneMatch) {
      const lIdx = laneMatch[1].toLowerCase() === 'now' ? 0 : laneMatch[1].toLowerCase() === 'next' ? 1 : 2;
      currentLane = lIdx;
      if (laneMatch[2].trim()) lanes[lIdx].items.push(laneMatch[2].trim());
      continue;
    }
    if (currentLane >= 0) {
      lanes[currentLane].items.push(line);
    } else {
      // No lane marker: distribute evenly
      const autoIdx = Math.min(2, Math.floor(lanes[0].items.length + lanes[1].items.length + lanes[2].items.length) % 3);
      lanes[autoIdx].items.push(line);
    }
  }

  // If no markers found, split lines into thirds
  if (lanes[0].items.length === 0 && lanes[1].items.length === 0 && lanes[2].items.length === 0) {
    const third = Math.ceil(lines.length / 3);
    lanes[0].items = lines.slice(0, third);
    lanes[1].items = lines.slice(third, third * 2);
    lanes[2].items = lines.slice(third * 2);
  }

  const laneTop = PAD + 90;
  const laneH = H - laneTop - PAD;
  const totalW = cW - PAD * 2;
  const laneGap = 16;
  const laneW = Math.round((totalW - laneGap * 2) / 3);

  let lanesHtml = '';
  const laneColors = [accents[0] || p.accent, accents[1] || p.primary, accents[2] || p.secondary];

  for (let li = 0; li < 3; li++) {
    const lx = PAD + li * (laneW + laneGap);
    const color = laneColors[li];

    // Lane background
    lanesHtml += `<div style="position:absolute;left:${lx}px;top:${laneTop}px;width:${laneW}px;height:${laneH}px;background:${hexToRgba(p.surface, 0.3)};border:1px solid ${hexToRgba(p.border, 0.2)};border-radius:12px;border-top:3px solid ${color}"></div>`;

    // Lane header
    lanesHtml += `<div style="position:absolute;left:${lx}px;top:${laneTop + 10}px;width:${laneW}px;text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:${color}">${escHtml(lanes[li].label)}</div>`;

    // Item cards
    const cardPad = 10;
    const cardStartY = laneTop + 42;
    const cardAvailH = laneH - 52;
    const items = lanes[li].items.slice(0, 5);
    const cardGap = 8;
    const cardH = Math.min(60, Math.round((cardAvailH - (items.length - 1) * cardGap) / Math.max(items.length, 1)));

    for (let ci = 0; ci < items.length; ci++) {
      const cy = cardStartY + ci * (cardH + cardGap);
      const cardBg = dark ? hexToRgba(p.surface, 0.5) : p.surface;
      lanesHtml += `<div style="position:absolute;left:${lx + cardPad}px;top:${cy}px;width:${laneW - cardPad * 2}px;height:${cardH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.15)};border-radius:8px;border-left:3px solid ${hexToRgba(color, 0.6)};box-shadow:${cardShadow(1, dark)}"></div>`;
      lanesHtml += `<div style="position:absolute;left:${lx + cardPad + 10}px;top:${cy + Math.round((cardH - 14) / 2)}px;width:${laneW - cardPad * 2 - 20}px;font-size:12px;line-height:1.4;color:${p.text};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(items[ci])}</div>`;
    }
  }

  // Arrow connectors between lanes
  let arrowsSvg = '';
  for (let li = 0; li < 2; li++) {
    const ax = PAD + (li + 1) * (laneW + laneGap) - laneGap / 2;
    const ay = laneTop + Math.round(laneH / 2);
    arrowsSvg += `<line x1="${ax - 6}" y1="${ay}" x2="${ax + 6}" y2="${ay}" stroke="${hexToRgba(p.border, 0.4)}" stroke-width="2" />`;
    arrowsSvg += `<polygon points="${ax + 3},${ay - 4} ${ax + 9},${ay} ${ax + 3},${ay + 4}" fill="${hexToRgba(p.border, 0.4)}" />`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${lanesHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${arrowsSvg}
  </svg>
</div>`;
}


// ── PRICING_TABLE ───────────────────────────────────────────
// Tiered pricing cards with recommended highlight

function buildPricingTable(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  // Use direct split to avoid parseBodyLines 8-line limit (pricing tables can have 15+ lines)
  const lines = slide.body.split('\n').map(l => l.replace(/^[-\u2022*\u2192\u25ba\u25b8\u279c]\s*/, '').replace(/<[^>]*>/g, '').trim()).filter(Boolean);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse tiers: "Tier Name:" starts a section, lines below are features
  const tiers: { name: string; price: string; features: string[]; recommended: boolean }[] = [];
  let currentTier: { name: string; price: string; features: string[]; recommended: boolean } | null = null;

  for (const line of lines) {
    const tierMatch = line.match(/^(Basic|Free|Starter|Pro|Professional|Plus|Enterprise|Business|Premium|Growth)\s*:\s*(.*)/i);
    if (tierMatch) {
      if (currentTier) tiers.push(currentTier);
      const priceMatch = tierMatch[2].match(/\$[\d,.]+(?:\/\w+)?/);
      currentTier = {
        name: tierMatch[1],
        price: priceMatch ? priceMatch[0] : tierMatch[2].trim(),
        features: [],
        recommended: /pro|professional|plus|growth/i.test(tierMatch[1]),
      };
      continue;
    }
    if (currentTier) {
      currentTier.features.push(line);
    } else {
      // Auto-create tiers from lines
      if (!currentTier) {
        currentTier = { name: line.slice(0, 20), price: '', features: [], recommended: false };
      }
    }
  }
  if (currentTier) tiers.push(currentTier);

  // Defaults
  if (tiers.length === 0) {
    tiers.push({ name: 'Basic', price: '$9/mo', features: ['5 projects', 'Basic support'], recommended: false });
    tiers.push({ name: 'Pro', price: '$29/mo', features: ['Unlimited projects', 'Priority support', 'Analytics'], recommended: true });
    tiers.push({ name: 'Enterprise', price: 'Custom', features: ['Custom SLA', 'Dedicated support', 'SSO'], recommended: false });
  }

  const count = Math.min(tiers.length, 4);
  const cardTop = PAD + 90;
  const totalW = cW - PAD * 2;
  const cardGap = 16;
  const cardW = Math.round((totalW - (count - 1) * cardGap) / count);
  const cardH = H - cardTop - PAD;

  let cardsHtml = '';

  for (let i = 0; i < count; i++) {
    const tier = tiers[i];
    const cx = PAD + i * (cardW + cardGap);
    const color = accents[i % accents.length];
    const isRec = tier.recommended;

    // Card container
    const borderStyle = isRec ? `border:2px solid ${p.accent}` : `border:1px solid ${hexToRgba(p.border, 0.2)}`;
    const cardBg = dark ? hexToRgba(p.surface, 0.4) : p.surface;
    const elevation = isRec ? 3 : 1;
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${isRec ? cardTop - 8 : cardTop}px;width:${cardW}px;height:${isRec ? cardH + 8 : cardH}px;background:${cardBg};${borderStyle};border-radius:16px;box-shadow:${cardShadow(elevation as 1 | 2 | 3, dark)};overflow:hidden"></div>`;

    // Recommended badge
    if (isRec) {
      cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cardTop - 8}px;width:${cardW}px;height:28px;background:${p.accent};border-radius:16px 16px 0 0;text-align:center;line-height:28px;font-size:11px;font-weight:bold;color:#fff;letter-spacing:1px">RECOMMENDED</div>`;
    }

    // Tier name
    const nameY = isRec ? cardTop + 28 : cardTop + 16;
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${nameY}px;width:${cardW}px;text-align:center;font-size:16px;font-weight:bold;color:${color}">${escHtml(tier.name)}</div>`;

    // Price
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${nameY + 30}px;width:${cardW}px;text-align:center;font-size:28px;font-weight:bold;color:${p.text}">${escHtml(tier.price)}</div>`;

    // Divider
    cardsHtml += `<div style="position:absolute;left:${cx + 20}px;top:${nameY + 72}px;width:${cardW - 40}px;height:1px;background:${hexToRgba(p.border, 0.2)}"></div>`;

    // Features
    let fy = nameY + 86;
    for (const feat of tier.features.slice(0, 6)) {
      cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${fy}px;width:${cardW - 32}px;font-size:12px;line-height:1.4;color:${p.text};opacity:0.8"><span style="color:${p.success || '#22c55e'};margin-right:6px">\u2713</span>${escHtml(feat)}</div>`;
      fy += 24;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
</div>`;
}


// ── UNIT_ECONOMICS ──────────────────────────────────────────
// Large central hero metric with supporting metrics around it

function buildUnitEconomics(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // First line = hero metric, rest = supporting
  const heroLine = lines.length > 0 ? lines[0] : '3.5x LTV:CAC';
  // Split pipe-separated supporting metrics into individual items
  const supporting: string[] = [];
  for (const supportLine of lines.slice(1, 7)) {
    if (supportLine.includes('|')) {
      supporting.push(...supportLine.split('|').map(s => s.trim()).filter(Boolean));
    } else {
      supporting.push(supportLine);
    }
  }

  // Parse hero metric — prefer = over : to handle LTV:CAC = 4.2x correctly
  const heroEqIdx = heroLine.indexOf('=');
  const heroSep = heroEqIdx > 0 ? heroEqIdx : heroLine.indexOf(':');
  let heroLabel = '';
  let heroValue = heroLine;
  if (heroSep > 0 && heroSep < 50) {
    heroLabel = heroLine.slice(0, heroSep).trim();
    heroValue = heroLine.slice(heroSep + 1).trim();
  }

  // Central hero
  const heroCx = Math.round(cW * 0.5);
  const heroCy = Math.round(H * 0.52);
  const heroR = 110;

  let heroHtml = '';
  // Large ring behind hero
  heroHtml += `<div style="position:absolute;left:${heroCx - heroR}px;top:${heroCy - heroR}px;width:${heroR * 2}px;height:${heroR * 2}px;border-radius:50%;background:${hexToRgba(p.accent, 0.08)};border:3px solid ${hexToRgba(p.accent, 0.3)}"></div>`;
  // Hero value
  heroHtml += `<div style="position:absolute;left:${heroCx - heroR}px;top:${heroCy - 30}px;width:${heroR * 2}px;text-align:center;font-size:48px;font-weight:bold;color:${p.accent}">${escHtml(heroValue)}</div>`;
  // Hero label below value
  if (heroLabel) {
    heroHtml += `<div style="position:absolute;left:${heroCx - heroR}px;top:${heroCy + 26}px;width:${heroR * 2}px;text-align:center;font-size:14px;font-weight:bold;color:${p.text};opacity:0.6;text-transform:uppercase;letter-spacing:1px">${escHtml(heroLabel)}</div>`;
  }

  // Supporting metrics in a ring around hero
  let supportHtml = '';
  const supportR = heroR + 120;
  const startAngle = -Math.PI / 2; // start from top
  const count = Math.min(supporting.length, 6);

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * 2 * Math.PI;
    const sx = heroCx + Math.round(supportR * Math.cos(angle));
    const sy = heroCy + Math.round(supportR * Math.sin(angle));
    const cardW = 150;
    const cardH = 60;

    const sep = supporting[i].indexOf(':');
    let sLabel = '';
    let sValue = supporting[i];
    if (sep > 0 && sep < 30) {
      sLabel = supporting[i].slice(0, sep).trim();
      sValue = supporting[i].slice(sep + 1).trim();
    }

    const cardBg = dark ? hexToRgba(p.surface, 0.4) : p.surface;
    supportHtml += `<div style="position:absolute;left:${sx - cardW / 2}px;top:${sy - cardH / 2}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.2)};border-radius:10px;box-shadow:${cardShadow(1, dark)};text-align:center;overflow:hidden"></div>`;
    supportHtml += `<div style="position:absolute;left:${sx - cardW / 2}px;top:${sy - cardH / 2 + 8}px;width:${cardW}px;text-align:center;font-size:18px;font-weight:bold;color:${p.primary}">${escHtml(sValue)}</div>`;
    if (sLabel) {
      supportHtml += `<div style="position:absolute;left:${sx - cardW / 2}px;top:${sy - cardH / 2 + 32}px;width:${cardW}px;text-align:center;font-size:10px;color:${p.text};opacity:0.6;text-transform:uppercase;letter-spacing:0.5px">${escHtml(sLabel)}</div>`;
    }
  }

  // Connecting lines from hero to supporting metrics (SVG)
  let linesSvg = '';
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * 2 * Math.PI;
    const sx = heroCx + Math.round(supportR * Math.cos(angle));
    const sy = heroCy + Math.round(supportR * Math.sin(angle));
    const ex = heroCx + Math.round((heroR + 10) * Math.cos(angle));
    const ey = heroCy + Math.round((heroR + 10) * Math.sin(angle));
    linesSvg += `<line x1="${ex}" y1="${ey}" x2="${sx}" y2="${sy}" stroke="${hexToRgba(p.border, 0.2)}" stroke-width="1" stroke-dasharray="4,4" />`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${heroHtml}
  ${supportHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${linesSvg}
  </svg>
</div>`;
}


// ── SWOT ────────────────────────────────────────────────────
// 4-quadrant colored grid: Strengths, Weaknesses, Opportunities, Threats

function buildSwot(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Parse body into SWOT sections
  const swot: { label: string; color: string; items: string[] }[] = [
    { label: 'Strengths', color: p.success || '#22c55e', items: [] },
    { label: 'Weaknesses', color: p.warning || '#eab308', items: [] },
    { label: 'Opportunities', color: p.primary || '#3b82f6', items: [] },
    { label: 'Threats', color: p.error || '#ef4444', items: [] },
  ];

  let currentSection = -1;
  for (const line of lines) {
    const sMatch = line.match(/^(S|Strengths?)\s*[-:]/i);
    const wMatch = line.match(/^(W|Weaknesses?)\s*[-:]/i);
    const oMatch = line.match(/^(O|Opportunities?)\s*[-:]/i);
    const tMatch = line.match(/^(T|Threats?)\s*[-:]/i);

    if (sMatch) { currentSection = 0; const rest = line.slice(sMatch[0].length).trim(); if (rest) swot[0].items.push(rest); continue; }
    if (wMatch) { currentSection = 1; const rest = line.slice(wMatch[0].length).trim(); if (rest) swot[1].items.push(rest); continue; }
    if (oMatch) { currentSection = 2; const rest = line.slice(oMatch[0].length).trim(); if (rest) swot[2].items.push(rest); continue; }
    if (tMatch) { currentSection = 3; const rest = line.slice(tMatch[0].length).trim(); if (rest) swot[3].items.push(rest); continue; }

    if (currentSection >= 0) {
      swot[currentSection].items.push(line);
    } else {
      // Auto-distribute
      swot[lines.indexOf(line) % 4].items.push(line);
    }
  }

  const gridLeft = PAD + 10;
  const gridTop = PAD + 80;
  const gridW = cW - PAD * 2 - 20;
  const gridH = H - gridTop - PAD;
  const halfW = Math.round(gridW / 2) - 6;
  const halfH = Math.round(gridH / 2) - 6;

  const positions = [
    { x: gridLeft, y: gridTop },                     // S: top-left
    { x: gridLeft + halfW + 12, y: gridTop },         // W: top-right
    { x: gridLeft, y: gridTop + halfH + 12 },         // O: bottom-left
    { x: gridLeft + halfW + 12, y: gridTop + halfH + 12 }, // T: bottom-right
  ];

  let quadHtml = '';
  for (let qi = 0; qi < 4; qi++) {
    const qp = positions[qi];
    const sq = swot[qi];
    const bgAlpha = dark ? 0.08 : 0.06;

    // Quadrant bg
    quadHtml += `<div style="position:absolute;left:${qp.x}px;top:${qp.y}px;width:${halfW}px;height:${halfH}px;background:${hexToRgba(sq.color, bgAlpha)};border:1px solid ${hexToRgba(sq.color, 0.15)};border-radius:12px;overflow:hidden"></div>`;
    // Color bar at top
    quadHtml += `<div style="position:absolute;left:${qp.x}px;top:${qp.y}px;width:${halfW}px;height:3px;background:${sq.color};border-radius:12px 12px 0 0"></div>`;
    // Section label
    quadHtml += `<div style="position:absolute;left:${qp.x + 14}px;top:${qp.y + 10}px;font-size:13px;font-weight:bold;color:${sq.color};text-transform:uppercase;letter-spacing:1px">${escHtml(sq.label)}</div>`;

    // Items
    let iy = qp.y + 34;
    for (const item of sq.items.slice(0, 4)) {
      quadHtml += `<div style="position:absolute;left:${qp.x + 14}px;top:${iy}px;width:${halfW - 28}px;font-size:12px;line-height:1.4;color:${p.text};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:${sq.color};margin-right:4px">\u2022</span>${escHtml(item)}</div>`;
      iy += Math.min(36, Math.round((halfH - 44) / Math.max(sq.items.length, 1)));
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 48}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${quadHtml}
</div>`;
}


// ── THREE_PILLARS ───────────────────────────────────────────
// Rule of Three — 3 tall equal columns with decorative numbers

function buildThreePillars(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse 3 pillars: "Title: description" format
  const pillars: { title: string; desc: string }[] = [];
  for (const line of lines.slice(0, 3)) {
    const sep = line.indexOf(':');
    if (sep > 0 && sep < 40) {
      pillars.push({ title: line.slice(0, sep).trim(), desc: line.slice(sep + 1).trim() });
    } else {
      pillars.push({ title: line.slice(0, 25).trim(), desc: line.slice(25).trim() });
    }
  }
  while (pillars.length < 3) {
    pillars.push({ title: `Pillar ${pillars.length + 1}`, desc: '' });
  }

  const colTop = PAD + 90;
  const totalW = cW - PAD * 2;
  const colGap = 20;
  const colW = Math.round((totalW - colGap * 2) / 3);
  const colH = H - colTop - PAD;

  let pillarsHtml = '';
  for (let i = 0; i < 3; i++) {
    const px = PAD + i * (colW + colGap);
    const color = accents[i % accents.length];
    const cardBg = dark ? hexToRgba(p.surface, 0.35) : p.surface;

    // Column card
    pillarsHtml += `<div style="position:absolute;left:${px}px;top:${colTop}px;width:${colW}px;height:${colH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.15)};border-radius:16px;box-shadow:${cardShadow(2, dark)};overflow:hidden"></div>`;
    // Accent stripe at top
    pillarsHtml += `<div style="position:absolute;left:${px}px;top:${colTop}px;width:${colW}px;height:4px;background:${color};border-radius:16px 16px 0 0"></div>`;

    // Large decorative number
    const numStr = String(i + 1).padStart(2, '0');
    pillarsHtml += `<div style="position:absolute;left:${px}px;top:${colTop + 14}px;width:${colW}px;text-align:center;font-size:48px;font-weight:900;color:${hexToRgba(color, 0.12)};line-height:1">${numStr}</div>`;

    // Pillar title
    pillarsHtml += `<div style="position:absolute;left:${px + 16}px;top:${colTop + 70}px;width:${colW - 32}px;text-align:center;font-size:16px;font-weight:bold;color:${color};line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(pillars[i].title)}</div>`;

    // Pillar description
    if (pillars[i].desc) {
      pillarsHtml += `<div style="position:absolute;left:${px + 16}px;top:${colTop + 114}px;width:${colW - 32}px;text-align:center;font-size:13px;line-height:1.5;color:${p.text};opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical">${escHtml(pillars[i].desc)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${pillarsHtml}
</div>`;
}


// ── BEFORE_AFTER ────────────────────────────────────────────
// Visual transformation — two panels with "BEFORE" / "AFTER"

function buildBeforeAfter(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Split on "Before/After" markers, "vs", or empty line
  const beforeItems: string[] = [];
  const afterItems: string[] = [];
  let inAfter = false;

  for (const line of lines) {
    if (/^(After|AFTER)\s*[-:]?\s*/i.test(line)) {
      inAfter = true;
      const rest = line.replace(/^(After|AFTER)\s*[-:]?\s*/i, '').trim();
      if (rest) afterItems.push(rest);
      continue;
    }
    if (/^(Before|BEFORE)\s*[-:]?\s*/i.test(line)) {
      inAfter = false;
      const rest = line.replace(/^(Before|BEFORE)\s*[-:]?\s*/i, '').trim();
      if (rest) beforeItems.push(rest);
      continue;
    }
    if (/^(vs\.?|-->|->|\u2192)$/i.test(line.trim())) {
      inAfter = true;
      continue;
    }
    if (inAfter) afterItems.push(line);
    else beforeItems.push(line);
  }

  // If no markers, split in half
  if (beforeItems.length === 0 && afterItems.length === 0) {
    const half = Math.ceil(lines.length / 2);
    beforeItems.push(...lines.slice(0, half));
    afterItems.push(...lines.slice(half));
  }

  const panelTop = PAD + 90;
  const panelH = H - panelTop - PAD;
  const totalW = cW - PAD * 2;
  const dividerW = 50;
  const panelW = Math.round((totalW - dividerW) / 2);
  const leftX = PAD;
  const rightX = PAD + panelW + dividerW;

  let panelsHtml = '';

  // Before panel
  const beforeBg = dark ? hexToRgba(p.error || '#ef4444', 0.05) : hexToRgba(p.error || '#ef4444', 0.04);
  panelsHtml += `<div style="position:absolute;left:${leftX}px;top:${panelTop}px;width:${panelW}px;height:${panelH}px;background:${beforeBg};border:1px solid ${hexToRgba(p.error || '#ef4444', 0.15)};border-radius:12px"></div>`;
  panelsHtml += `<div style="position:absolute;left:${leftX}px;top:${panelTop + 10}px;width:${panelW}px;text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:${p.error || '#ef4444'}">\u2717 BEFORE</div>`;

  let by = panelTop + 40;
  for (const item of beforeItems.slice(0, 5)) {
    panelsHtml += `<div style="position:absolute;left:${leftX + 16}px;top:${by}px;width:${panelW - 32}px;font-size:13px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:${p.error || '#ef4444'};margin-right:6px">\u2022</span>${escHtml(item)}</div>`;
    by += Math.min(44, Math.round((panelH - 50) / Math.max(beforeItems.length, 1)));
  }

  // After panel
  const afterBg = dark ? hexToRgba(p.success || '#22c55e', 0.05) : hexToRgba(p.success || '#22c55e', 0.04);
  panelsHtml += `<div style="position:absolute;left:${rightX}px;top:${panelTop}px;width:${panelW}px;height:${panelH}px;background:${afterBg};border:1px solid ${hexToRgba(p.success || '#22c55e', 0.15)};border-radius:12px"></div>`;
  panelsHtml += `<div style="position:absolute;left:${rightX}px;top:${panelTop + 10}px;width:${panelW}px;text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:${p.success || '#22c55e'}">\u2713 AFTER</div>`;

  let ay = panelTop + 40;
  for (const item of afterItems.slice(0, 5)) {
    panelsHtml += `<div style="position:absolute;left:${rightX + 16}px;top:${ay}px;width:${panelW - 32}px;font-size:13px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:${p.success || '#22c55e'};margin-right:6px">\u2022</span>${escHtml(item)}</div>`;
    ay += Math.min(44, Math.round((panelH - 50) / Math.max(afterItems.length, 1)));
  }

  // Center divider with arrow
  const divCx = PAD + panelW + Math.round(dividerW / 2);
  const divCy = panelTop + Math.round(panelH / 2);
  let arrowSvg = `<line x1="${divCx - 16}" y1="${divCy}" x2="${divCx + 16}" y2="${divCy}" stroke="${p.accent}" stroke-width="3" />`;
  arrowSvg += `<polygon points="${divCx + 12},${divCy - 6} ${divCx + 22},${divCy} ${divCx + 12},${divCy + 6}" fill="${p.accent}" />`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${panelsHtml}
  <svg style="position:absolute;left:0;top:0" width="${cW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${arrowSvg}
  </svg>
</div>`;
}


// ── SOCIAL_PROOF ────────────────────────────────────────────
// Aggregated credibility — large rating/number + trust badges

function buildSocialProof(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Press variant detection: lines containing em dash or pipe as publication separator
  const pressLines = lines.filter((l) => / \u2014 /.test(l) || / \| /.test(l));
  if (pressLines.length >= 2) {
    return buildSocialProofPress(slide, p, cW, dark, pressLines);
  }

  // First line = hero stat, rest = badges/awards
  const heroText = lines.length > 0 ? lines[0] : '4.9/5 from 2,400+ reviews';
  const badges = lines.slice(1, 7);

  // Parse hero for rating number
  const ratingMatch = heroText.match(/([\d.]+)\s*\/\s*(\d+)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.8;
  const maxRating = ratingMatch ? parseInt(ratingMatch[2], 10) : 5;

  // Stars visualization
  const starCount = Math.min(maxRating, 5);
  const fullStars = Math.floor(rating);
  const heroCx = Math.round(cW * 0.5);
  const heroCy = Math.round(H * 0.38);

  let starsHtml = '';
  const starSize = 28;
  const starGap = 6;
  const starsWidth = starCount * starSize + (starCount - 1) * starGap;
  const starsLeft = heroCx - Math.round(starsWidth / 2);

  for (let i = 0; i < starCount; i++) {
    const sx = starsLeft + i * (starSize + starGap);
    const filled = i < fullStars;
    const starColor = filled ? (p.warning || '#eab308') : hexToRgba(p.border, 0.3);
    starsHtml += `<div style="position:absolute;left:${sx}px;top:${heroCy - 50}px;font-size:${starSize}px;color:${starColor}">\u2605</div>`;
  }

  // Hero stat text
  const heroHtml = `<div style="position:absolute;left:${PAD}px;top:${heroCy}px;width:${cW - PAD * 2}px;text-align:center;font-size:22px;color:${p.text};opacity:0.85">${escHtml(heroText)}</div>`;

  // Badge cards in a grid
  let badgesHtml = '';
  const badgeTop = heroCy + 60;
  const badgeCols = Math.min(badges.length, 3);
  const badgeGap = 16;
  const badgeW = Math.round((cW - PAD * 2 - (badgeCols - 1) * badgeGap) / badgeCols);
  const badgeH = 55;

  for (let i = 0; i < badges.length; i++) {
    const col = i % badgeCols;
    const row = Math.floor(i / badgeCols);
    const bx = PAD + col * (badgeW + badgeGap);
    const bby = badgeTop + row * (badgeH + badgeGap);
    const cardBg = dark ? hexToRgba(p.surface, 0.4) : p.surface;

    badgesHtml += `<div style="position:absolute;left:${bx}px;top:${bby}px;width:${badgeW}px;height:${badgeH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.15)};border-radius:10px;box-shadow:${cardShadow(1, dark)};overflow:hidden"></div>`;
    badgesHtml += `<div style="position:absolute;left:${bx + 12}px;top:${bby + Math.round((badgeH - 14) / 2)}px;width:${badgeW - 24}px;font-size:13px;color:${p.text};text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"><span style="color:${p.accent};margin-right:6px">\u2605</span>${escHtml(badges[i])}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${starsHtml}
  ${heroHtml}
  ${badgesHtml}
</div>`;
}


// ── SOCIAL_PROOF (Press Clipping Variant) ────────────────────

function buildSocialProofPress(
  slide: SlideInput,
  p: ColorPalette,
  cW: number,
  dark: boolean,
  pressLines: string[],
): string {
  const items = pressLines.slice(0, 6).map((line) => {
    // Split on em dash or pipe
    const sepMatch = line.match(/ \u2014 | \| /);
    if (sepMatch) {
      const idx = line.indexOf(sepMatch[0]);
      return { headline: line.slice(0, idx).trim(), publication: line.slice(idx + sepMatch[0].length).trim() };
    }
    return { headline: line, publication: '' };
  });

  const cols = items.length >= 4 ? 2 : 1;
  const rows = Math.ceil(items.length / cols);
  const cardGap = 16;
  const totalW = cW - PAD * 2;
  const cardW = cols === 1 ? totalW : Math.round((totalW - cardGap) / 2);
  const cardTop = PAD + 90;
  const cardH = Math.min(90, Math.round((H - cardTop - PAD - (rows - 1) * cardGap) / rows));

  let cardsHtml = '';
  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (cardW + cardGap);
    const cy = cardTop + row * (cardH + cardGap);
    const cardBg = dark ? hexToRgba(p.surface, 0.4) : p.surface;

    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.15)};border-left:3px solid ${p.accent};border-radius:8px;box-shadow:${cardShadow(1, dark)};overflow:hidden"></div>`;
    // Publication name (uppercase, small)
    if (items[i].publication) {
      cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cy + 10}px;width:${cardW - 32}px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${p.accent};opacity:0.8;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(items[i].publication)}</div>`;
    }
    // Headline (bold)
    const headlineTop = items[i].publication ? cy + 30 : cy + 14;
    cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${headlineTop}px;width:${cardW - 32}px;font-size:14px;font-weight:bold;color:${p.text};line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(items[i].headline)}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.04, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
</div>`;
}

// ── OBJECTION_HANDLER ───────────────────────────────────────
// Left panel: objection in italic with red accent, right: rebuttal with green data points

function buildObjectionHandler(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Split on "---" or marker for objection vs rebuttal
  const objectionLines: string[] = [];
  const rebuttalLines: string[] = [];
  let inRebuttal = false;

  for (const line of lines) {
    if (/^---+$/.test(line.trim()) || /^(But|However|Rebuttal|Response|Answer)\s*[-:]?\s*/i.test(line)) {
      inRebuttal = true;
      const cleaned = line.replace(/^(But|However|Rebuttal|Response|Answer)\s*[-:]?\s*/i, '').trim();
      if (cleaned && !/^---+$/.test(cleaned)) rebuttalLines.push(cleaned);
      continue;
    }
    if (inRebuttal) rebuttalLines.push(line);
    else objectionLines.push(line);
  }

  // If no separator, first line is objection, rest is rebuttal
  if (objectionLines.length === 0 && rebuttalLines.length === 0) {
    if (lines.length > 0) objectionLines.push(lines[0]);
    rebuttalLines.push(...lines.slice(1));
  } else if (rebuttalLines.length === 0 && objectionLines.length > 1) {
    rebuttalLines.push(...objectionLines.splice(1));
  }

  const panelTop = PAD + 90;
  const panelH = H - panelTop - PAD;
  const totalW = cW - PAD * 2;
  const leftW = Math.round(totalW * 0.32);
  const rightW = totalW - leftW - 20;
  const leftX = PAD;
  const rightX = PAD + leftW + 20;

  let html = '';

  // Left panel — objection
  const objBg = dark ? hexToRgba(p.error || '#ef4444', 0.06) : hexToRgba(p.error || '#ef4444', 0.04);
  html += `<div style="position:absolute;left:${leftX}px;top:${panelTop}px;width:${leftW}px;height:${panelH}px;background:${objBg};border:1px solid ${hexToRgba(p.error || '#ef4444', 0.15)};border-radius:12px;border-left:4px solid ${p.error || '#ef4444'}"></div>`;
  html += `<div style="position:absolute;left:${leftX + 16}px;top:${panelTop + 14}px;font-size:14px;font-weight:bold;color:${p.error || '#ef4444'}">But...</div>`;

  let oy = panelTop + 44;
  for (const item of objectionLines.slice(0, 3)) {
    html += `<div style="position:absolute;left:${leftX + 16}px;top:${oy}px;width:${leftW - 32}px;font-size:15px;font-style:italic;line-height:1.5;color:${p.text};opacity:0.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">&ldquo;${escHtml(item)}&rdquo;</div>`;
    oy += 70;
  }

  // Right panel — rebuttal
  const rebBg = dark ? hexToRgba(p.success || '#22c55e', 0.05) : hexToRgba(p.success || '#22c55e', 0.03);
  html += `<div style="position:absolute;left:${rightX}px;top:${panelTop}px;width:${rightW}px;height:${panelH}px;background:${rebBg};border:1px solid ${hexToRgba(p.success || '#22c55e', 0.15)};border-radius:12px;border-left:4px solid ${p.success || '#22c55e'}"></div>`;
  html += `<div style="position:absolute;left:${rightX + 16}px;top:${panelTop + 14}px;font-size:14px;font-weight:bold;color:${p.success || '#22c55e'}">The Data Says...</div>`;

  let ry = panelTop + 44;
  for (const item of rebuttalLines.slice(0, 5)) {
    html += `<div style="position:absolute;left:${rightX + 16}px;top:${ry}px;width:${rightW - 32}px;font-size:14px;line-height:1.5;color:${p.text};opacity:0.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:${p.success || '#22c55e'};font-weight:bold;margin-right:6px">\u2713</span>${escHtml(item)}</div>`;
    ry += Math.min(50, Math.round((panelH - 54) / Math.max(rebuttalLines.length, 1)));
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${html}
</div>`;
}


// ── FAQ ─────────────────────────────────────────────────────
// Card-based Q&A pairs

function buildFaq(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  // Parse Q/A pairs
  const qaPairs: { q: string; a: string }[] = [];
  let currentQ = '';

  for (const line of lines) {
    const qMatch = line.match(/^Q\s*[-:.]?\s*(.+)/i);
    const aMatch = line.match(/^A\s*[-:.]?\s*(.+)/i);

    if (qMatch) {
      if (currentQ && qaPairs.length > 0) {
        // Previous Q had no A, keep it
      }
      currentQ = qMatch[1].trim();
      continue;
    }
    if (aMatch && currentQ) {
      qaPairs.push({ q: currentQ, a: aMatch[1].trim() });
      currentQ = '';
      continue;
    }
    // If no Q/A markers, alternate Q and A
    if (qaPairs.length === 0 && currentQ === '') {
      currentQ = line;
    } else if (currentQ) {
      qaPairs.push({ q: currentQ, a: line });
      currentQ = '';
    }
  }
  // Leftover Q without A
  if (currentQ) qaPairs.push({ q: currentQ, a: '' });

  if (qaPairs.length === 0) {
    qaPairs.push({ q: 'What makes us different?', a: 'Our unique approach combines...' });
  }

  const count = Math.min(qaPairs.length, 6);
  const cols = count <= 3 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const cardTop = PAD + 90;
  const totalW = cW - PAD * 2;
  const cardGap = 12;
  const cardW = cols === 1 ? totalW : Math.round((totalW - cardGap) / 2);
  const cardH = Math.min(100, Math.round((H - cardTop - PAD - (rows - 1) * cardGap) / rows));

  let cardsHtml = '';
  for (let i = 0; i < count; i++) {
    const qa = qaPairs[i];
    const col = cols === 1 ? 0 : i % cols;
    const row = cols === 1 ? i : Math.floor(i / cols);
    const cx = PAD + col * (cardW + cardGap);
    const cy = cardTop + row * (cardH + cardGap);
    const color = accents[i % accents.length];
    const cardBg = dark ? hexToRgba(p.surface, 0.35) : p.surface;

    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border:1px solid ${hexToRgba(p.border, 0.15)};border-radius:12px;box-shadow:${cardShadow(1, dark)};overflow:hidden"></div>`;
    // Q prefix
    cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + 10}px;width:${cardW - 24}px;font-size:14px;font-weight:bold;color:${p.text};line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"><span style="color:${color};font-weight:900;margin-right:6px">Q:</span>${escHtml(qa.q)}</div>`;
    // Answer
    if (qa.a) {
      cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + Math.min(50, Math.round(cardH * 0.5))}px;width:${cardW - 24}px;font-size:12px;line-height:1.4;color:${p.text};opacity:0.75;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(qa.a)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
</div>`;
}


// ── VERDICT ─────────────────────────────────────────────────
// Conclusion/recommendation with colored verdict bar

function buildVerdict(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // First line = verdict, rest = rationale
  const verdictText = lines.length > 0 ? lines[0] : 'Recommended';
  const rationale = lines.slice(1, 6);

  // Detect sentiment for verdict bar color
  const lowerVerdict = verdictText.toLowerCase();
  let verdictColor = p.success || '#22c55e'; // default green
  if (/not recommended|avoid|reject|fail|poor|weak|decline|stop/i.test(lowerVerdict)) {
    verdictColor = p.error || '#ef4444';
  } else if (/caution|risk|consider|maybe|mixed|partial|moderate|conditional/i.test(lowerVerdict)) {
    verdictColor = p.warning || '#eab308';
  }

  const verdictY = Math.round(H * 0.32);
  const barY = verdictY + 50;
  const barW = Math.round((cW - PAD * 2) * 0.6);
  const barLeft = Math.round((cW - barW) / 2);

  let html = '';

  // Verdict text
  html += `<div style="position:absolute;left:${PAD}px;top:${verdictY}px;width:${cW - PAD * 2}px;text-align:center;font-size:32px;font-weight:bold;color:${verdictColor};line-height:1.3">${escHtml(verdictText)}</div>`;

  // Verdict bar
  html += `<div style="position:absolute;left:${barLeft}px;top:${barY}px;width:${barW}px;height:6px;background:${hexToRgba(p.border, 0.15)};border-radius:3px"></div>`;
  html += `<div style="position:absolute;left:${barLeft}px;top:${barY}px;width:${barW}px;height:6px;background:${verdictColor};border-radius:3px;box-shadow:0 0 12px ${hexToRgba(verdictColor, 0.4)}"></div>`;

  // Rationale
  let ry = barY + 30;
  for (const item of rationale.slice(0, 5)) {
    html += `<div style="position:absolute;left:${PAD + 40}px;top:${ry}px;width:${cW - PAD * 2 - 80}px;text-align:center;font-size:15px;line-height:1.5;color:${p.text};opacity:0.8">${escHtml(item)}</div>`;
    ry += 36;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${html}
</div>`;
}


// ── COHORT_TABLE ────────────────────────────────────────────
// Retention matrix with color-intensity cells

function buildCohortTable(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Parse "Month N: X%, Y%, Z%" format or simple table rows
  const rows: { label: string; values: number[] }[] = [];
  const headers: string[] = [];

  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep > 0 && sep < 30) {
      const label = line.slice(0, sep).trim();
      const valsStr = line.slice(sep + 1).trim();
      const vals = valsStr.split(/[,\s]+/).map(v => {
        const num = parseFloat(v.replace('%', ''));
        return isNaN(num) ? 0 : num;
      }).filter(v => v > 0 || valsStr.includes('0'));
      if (vals.length > 0) rows.push({ label, values: vals });
    }
  }

  // Default data
  if (rows.length === 0) {
    rows.push({ label: 'Jan', values: [100, 80, 65, 50, 42] });
    rows.push({ label: 'Feb', values: [100, 75, 60, 48] });
    rows.push({ label: 'Mar', values: [100, 82, 68] });
    rows.push({ label: 'Apr', values: [100, 78] });
  }

  const maxCols = Math.max(...rows.map(r => r.values.length), 1);
  for (let i = 0; i < maxCols; i++) headers.push(`P${i}`);

  const tableLeft = PAD + 10;
  const tableTop = PAD + 90;
  const tableW = cW - PAD * 2 - 20;
  const labelColW = Math.round(tableW * 0.15);
  const dataCellW = Math.round((tableW - labelColW) / maxCols);
  const rowH = Math.min(45, Math.round((H - tableTop - PAD) / (rows.length + 1)));

  let tableHtml = '';

  // Header row
  tableHtml += `<div style="position:absolute;left:${tableLeft}px;top:${tableTop}px;width:${labelColW}px;height:${rowH}px;border-bottom:2px solid ${p.border};line-height:${rowH}px;font-size:11px;font-weight:bold;color:${p.text};opacity:0.5;padding-left:8px">Cohort</div>`;
  for (let ci = 0; ci < maxCols; ci++) {
    const cx = tableLeft + labelColW + ci * dataCellW;
    tableHtml += `<div style="position:absolute;left:${cx}px;top:${tableTop}px;width:${dataCellW}px;height:${rowH}px;border-bottom:2px solid ${p.border};text-align:center;line-height:${rowH}px;font-size:11px;font-weight:bold;color:${p.text};opacity:0.5">${headers[ci]}</div>`;
  }

  // Data rows
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const ry = tableTop + (ri + 1) * rowH;

    tableHtml += `<div style="position:absolute;left:${tableLeft}px;top:${ry}px;width:${labelColW}px;height:${rowH}px;border-bottom:1px solid ${hexToRgba(p.border, 0.15)};line-height:${rowH}px;font-size:12px;font-weight:bold;color:${p.text};padding-left:8px">${escHtml(row.label)}</div>`;

    for (let ci = 0; ci < maxCols; ci++) {
      const cx = tableLeft + labelColW + ci * dataCellW;
      const val = ci < row.values.length ? row.values[ci] : -1;

      if (val < 0) {
        // No data for this cell
        tableHtml += `<div style="position:absolute;left:${cx}px;top:${ry}px;width:${dataCellW}px;height:${rowH}px;border-bottom:1px solid ${hexToRgba(p.border, 0.1)}"></div>`;
      } else {
        // Color intensity based on value (higher = darker accent)
        const intensity = Math.min(val / 100, 1);
        const bgColor = hexToRgba(p.accent, 0.05 + intensity * 0.35);
        const textColor = intensity > 0.6 ? '#fff' : p.text;
        tableHtml += `<div style="position:absolute;left:${cx}px;top:${ry}px;width:${dataCellW}px;height:${rowH}px;background:${bgColor};border-bottom:1px solid ${hexToRgba(p.border, 0.1)};text-align:center;line-height:${rowH}px;font-size:12px;font-weight:bold;color:${textColor}">${val}%</div>`;
      }
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${tableHtml}
</div>`;
}


// ── PROGRESS_TRACKER ────────────────────────────────────────
// Horizontal progress bars with fill showing % complete

function buildProgressTracker(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  // Parse "Item Name: 75%" format
  const items: { name: string; pct: number }[] = [];
  for (const line of lines.slice(0, 8)) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const name = line.slice(0, sep).trim();
      const rest = line.slice(sep + 1).trim();
      const pctMatch = rest.match(/(\d+)\s*%?/);
      if (pctMatch) {
        items.push({ name, pct: Math.min(100, parseInt(pctMatch[1], 10)) });
        continue;
      }
    }
    // Fallback: try to find percentage anywhere
    const anyPct = line.match(/(\d+)\s*%/);
    if (anyPct) {
      const name = line.replace(/\d+\s*%.*/, '').trim() || `Item ${items.length + 1}`;
      items.push({ name, pct: Math.min(100, parseInt(anyPct[1], 10)) });
    }
  }

  if (items.length === 0) {
    items.push({ name: 'Design', pct: 100 });
    items.push({ name: 'Development', pct: 75 });
    items.push({ name: 'Testing', pct: 40 });
    items.push({ name: 'Launch', pct: 10 });
  }

  const count = items.length;
  const barStartY = PAD + 100;
  const barAvailH = H - barStartY - PAD;
  const barGap = 12;
  const barH = Math.min(40, Math.round((barAvailH - (count - 1) * barGap) / count));
  const barLeft = PAD + 10;
  const barW = cW - PAD * 2 - 20;
  const labelW = Math.round(barW * 0.28);
  const trackLeft = barLeft + labelW + 10;
  const trackW = barW - labelW - 60; // leave space for percentage label
  const trackH = Math.max(12, Math.round(barH * 0.45));

  let barsHtml = '';

  for (let i = 0; i < count; i++) {
    const item = items[i];
    const by = barStartY + i * (barH + barGap);
    const trackY = by + Math.round((barH - trackH) / 2);

    // Color based on percentage
    let barColor: string;
    if (item.pct >= 75) barColor = p.success || '#22c55e';
    else if (item.pct >= 40) barColor = p.warning || '#eab308';
    else barColor = p.error || '#ef4444';

    // Label
    barsHtml += `<div style="position:absolute;left:${barLeft}px;top:${by + Math.round((barH - 16) / 2)}px;width:${labelW}px;font-size:14px;font-weight:600;color:${p.text};overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(item.name)}</div>`;

    // Track background
    barsHtml += `<div style="position:absolute;left:${trackLeft}px;top:${trackY}px;width:${trackW}px;height:${trackH}px;background:${hexToRgba(p.border, 0.15)};border-radius:${Math.round(trackH / 2)}px"></div>`;

    // Fill
    const fillW = Math.round(trackW * item.pct / 100);
    barsHtml += `<div style="position:absolute;left:${trackLeft}px;top:${trackY}px;width:${fillW}px;height:${trackH}px;background:${barColor};border-radius:${Math.round(trackH / 2)}px;box-shadow:0 0 8px ${hexToRgba(barColor, 0.3)}"></div>`;

    // Percentage label
    barsHtml += `<div style="position:absolute;left:${trackLeft + trackW + 8}px;top:${by + Math.round((barH - 14) / 2)}px;font-size:14px;font-weight:bold;color:${barColor}">${item.pct}%</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.04, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${barsHtml}
</div>`;
}


// ── FLYWHEEL ────────────────────────────────────────────────
// Circular SVG loop with gradient arcs, glow center, multi-ring background, glass label cards

function buildFlywheel(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const raw = slide.body.replace(/\u2192/g, '\u2192');
  const steps = raw.split(/\u2192|->|=>/).map(s => s.trim()).filter(Boolean);
  const n = Math.min(steps.length, 8) || 4;
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);
  const dark = isDarkBackground(p.background);

  const cx = Math.round(cW * 0.5);
  const cy = Math.round(H * 0.52);
  const R = Math.min(Math.round(cW * 0.21), 195);
  const labelR = R + 85;

  // ── SVG defs: gradients, glow filter, dot mesh ──
  let svgDefs = '<defs>';
  svgDefs += `<filter id="fwglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<pattern id="fwdot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  for (let i = 0; i < n; i++) {
    const col = accents[i % accents.length];
    const col2 = accents[(i + 1) % accents.length];
    svgDefs += `<linearGradient id="fwg${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${col2}"/></linearGradient>`;
  }
  svgDefs += '</defs>';

  let svgInner = svgDefs;

  // Dot mesh background
  svgInner += `<rect x="${PAD}" y="${PAD}" width="${cW - PAD * 2}" height="${H - PAD * 2}" fill="url(#fwdot)" opacity="0.5"/>`;

  // ── Concentric background rings (3 decorative rings with dashes) ──
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R + 40}" fill="none" stroke="${hexToRgba(p.accent, 0.04)}" stroke-width="1" stroke-dasharray="6,8"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R + 25}" fill="none" stroke="${hexToRgba(p.accent, 0.06)}" stroke-width="1" stroke-dasharray="4,10"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R - 25}" fill="none" stroke="${hexToRgba(p.accent, 0.05)}" stroke-width="1" stroke-dasharray="3,6"/>`;

  // ── Arc segments with glow backing + particle dots ──
  const arcGap = 0.08;
  const arcSpan = (2 * Math.PI / n) - arcGap;
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2 - Math.PI / 2 + arcGap / 2;
    const a2 = a1 + arcSpan;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const large = arcSpan > Math.PI ? 1 : 0;
    const col = accents[i % accents.length];

    // 22px glow backing at 0.1 opacity
    svgInner += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${hexToRgba(col, 0.1)}" stroke-width="22" stroke-linecap="round"/>`;
    // 14px main arc
    svgInner += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="url(#fwg${i})" stroke-width="14" stroke-linecap="round" opacity="0.9"/>`;

    // Particle dots along the arc (3 dots per segment)
    for (let d = 0; d < 3; d++) {
      const t = 0.2 + d * 0.3;
      const pa = a1 + arcSpan * t;
      const pr = R + (d % 2 === 0 ? 22 : -18);
      const px = cx + pr * Math.cos(pa), py = cy + pr * Math.sin(pa);
      svgInner += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${1.5 + d * 0.3}" fill="${hexToRgba(col, 0.25)}"/>`;
    }

    // Arrowhead (sz=16, filled with next accent)
    const sz = 16;
    const aDelta = 0.12;
    const tangentX = -Math.sin(a2), tangentY = Math.cos(a2);
    const col2 = accents[(i + 1) % accents.length];
    svgInner += `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 - tangentX * sz * 0.6 + Math.cos(a2) * sz).toFixed(1)},${(y2 - tangentY * sz * 0.6 + Math.sin(a2) * sz).toFixed(1)} ${(x2 + tangentX * sz * 0.6 + Math.cos(a2) * sz).toFixed(1)},${(y2 + tangentY * sz * 0.6 + Math.sin(a2) * sz).toFixed(1)}" fill="${col2}" opacity="0.9"/>`;
  }

  // ── Center: 3 concentric circles + infinity + GROWTH label ──
  svgInner += `<circle cx="${cx}" cy="${cy}" r="45" fill="${hexToRgba(p.accent, 0.04)}" stroke="${hexToRgba(p.accent, 0.12)}" stroke-width="2"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="34" fill="${hexToRgba(p.accent, 0.08)}" stroke="${hexToRgba(p.accent, 0.18)}" stroke-width="1.5"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="22" fill="${p.accent}" opacity="0.2" filter="url(#fwglo)"/>`;

  // ── Labels: glass cards with connector lines ──
  let labelsHtml = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + labelR * Math.cos(a);
    const ly = cy + labelR * Math.sin(a);
    const col = accents[i % accents.length];

    // Dashed connector line from arc to label card
    const innerX = cx + (R + 20) * Math.cos(a), innerY = cy + (R + 20) * Math.sin(a);
    const outerX = cx + (labelR - 14) * Math.cos(a), outerY = cy + (labelR - 14) * Math.sin(a);
    svgInner += `<line x1="${innerX.toFixed(1)}" y1="${innerY.toFixed(1)}" x2="${outerX.toFixed(1)}" y2="${outerY.toFixed(1)}" stroke="${hexToRgba(col, 0.3)}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    const align = lx < cx ? 'right' : 'left';
    const boxW = 170;
    const left = align === 'right' ? lx - boxW : lx;
    const cardBg = dark ? hexToRgba(p.surface, 0.25) : hexToRgba(p.surface, 0.92);
    const glassBorder = dark ? 'border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.15)};`;
    const blurCSS = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' : '';
    labelsHtml += `<div style="position:absolute;left:${Math.round(left)}px;top:${Math.round(ly - 18)}px;width:${boxW}px;padding:8px 12px;background:${cardBg};${glassBorder}${blurCSS}border-left:3px solid ${col};border-radius:10px;box-shadow:${cardShadow(2, dark)};text-align:${align}">`;
    labelsHtml += `<div style="display:flex;align-items:center;${align === 'right' ? 'flex-direction:row-reverse;' : ''}gap:6px">`;
    labelsHtml += `<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,${col},${hexToRgba(col, 0.6)});flex-shrink:0"></div>`;
    labelsHtml += `<span style="font-size:13px;font-weight:800;color:${col};letter-spacing:0.5px;line-height:1.3">${escHtml(steps[i] || 'Step ' + (i + 1))}</span>`;
    labelsHtml += `</div></div>`;
  }

  // Center HTML overlay: infinity + GROWTH
  const centerHtml = `<div style="position:absolute;left:${cx - 35}px;top:${cy - 18}px;width:70px;text-align:center">` +
    `<div style="font-size:22px;font-weight:bold;color:${p.accent};${dark ? textGlow(p.accent, 0.3) : ''}">\u221E</div>` +
    `<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${p.accent};opacity:0.6;margin-top:-3px">GROWTH</div></div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${labelsHtml}
  ${centerHtml}
</div>`;
}


// ── REVENUE_MODEL ──────────────────────────────────────────────
// Glass channel cards with gradient borders + thick donut with glow ring + center total

function buildRevenueModel(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  interface Channel { name: string; amount: string; pct: number; }
  const channels: Channel[] = [];
  let totalLabel = '';
  for (const line of lines) {
    const m = line.match(/^(.+?):\s*(\$[\d.,]+[MmKkBb]?)\s*\((\d+)%?\)/);
    if (m) { channels.push({ name: m[1].trim(), amount: m[2], pct: parseInt(m[3], 10) }); }
    else {
      const totalMatch = line.match(/total.*?(\$[\d.,]+[MmKkBb]?)/i);
      if (totalMatch) totalLabel = totalMatch[1];
    }
  }
  if (channels.length === 0) {
    channels.push({ name: 'Primary', amount: '$8M', pct: 60 }, { name: 'Secondary', amount: '$4M', pct: 30 }, { name: 'Other', amount: '$1M', pct: 10 });
  }

  const leftW = Math.round(cW * 0.52);
  const startY = PAD + 95;
  const cardH = Math.min(72, Math.round((H - startY - PAD - 10) / channels.length) - 10);
  const cardW = leftW - PAD - 16;

  // ── SVG defs: glow filter, dot mesh ──
  let svgDefs = `<defs>`;
  svgDefs += `<filter id="rmglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<pattern id="rmdot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgDefs += `</defs>`;

  let svgInner = svgDefs;
  // Dot mesh over card area
  svgInner += `<rect x="${PAD}" y="${startY - 10}" width="${leftW - PAD}" height="${H - startY - PAD + 10}" fill="url(#rmdot)" opacity="0.5"/>`;

  // ── Channel cards: glass style, gradient border, icon circle, progress bar ──
  let cardsHtml = '';
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const col = accents[i % accents.length];
    const cy = startY + i * (cardH + 10);
    const cardBg = dark ? hexToRgba(p.surface, 0.25) : p.surface;
    const glassBorder = dark ? 'border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.1)};`;
    const blurCSS = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' : '';

    cardsHtml += `<div style="position:absolute;left:${PAD}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border-left:4px solid ${col};${glassBorder}${blurCSS}border-radius:12px;box-shadow:${cardShadow(2, dark)};padding:8px 14px">`;
    cardsHtml += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">`;
    // Icon circle with gradient fill (30px)
    cardsHtml += `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${col},${hexToRgba(col, 0.6)});display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0">${escHtml(ch.name.charAt(0).toUpperCase())}</div>`;
    cardsHtml += `<span style="font-size:14px;font-weight:800;color:${p.text};letter-spacing:0.5px">${escHtml(ch.name)}</span>`;
    cardsHtml += `<span style="margin-left:auto;font-size:15px;font-weight:bold;color:${col}">${escHtml(ch.amount)}</span>`;
    cardsHtml += `</div>`;
    // Progress bar (8px height)
    cardsHtml += `<div style="height:8px;background:${hexToRgba(p.border, 0.12)};border-radius:4px;overflow:hidden"><div style="width:${ch.pct}%;height:100%;background:linear-gradient(90deg,${col},${hexToRgba(col, 0.6)});border-radius:4px"></div></div>`;
    // Percentage label
    cardsHtml += `<div style="font-size:11px;color:${p.text};opacity:0.5;margin-top:3px;font-weight:600">${ch.pct}% of revenue</div>`;
    cardsHtml += `</div>`;
  }

  // ── Donut chart: thicker stroke (38px), glow ring, rounded caps ──
  const donutCx = Math.round(cW * 0.78);
  const donutCy = Math.round(H * 0.52);
  const donutR = 100;
  const sw = 38;
  const circumference = 2 * Math.PI * donutR;
  const gapPct = 1.5;
  let offset = 0;

  // Glow ring behind donut (sw+6 at 0.08)
  svgInner += `<circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="${hexToRgba(p.accent, 0.08)}" stroke-width="${sw + 6}" filter="url(#rmglo)"/>`;
  // Shadow ring
  svgInner += `<circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="${hexToRgba(p.border, 0.06)}" stroke-width="${sw + 4}"/>`;

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const col = accents[i % accents.length];
    const segPct = Math.max(ch.pct - gapPct, 0.5);
    const dash = (segPct / 100) * circumference;
    const gapDash = (gapPct / 100) * circumference;
    svgInner += `<circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round" transform="rotate(-90 ${donutCx} ${donutCy})" opacity="0.88"/>`;
    offset += dash + gapDash;
  }

  // Center text: larger (24px), bold total, "Total" subtitle
  const centerTotal = totalLabel || 'Revenue';
  const centerHtml = `<div style="position:absolute;left:${donutCx - 55}px;top:${donutCy - 26}px;width:110px;text-align:center">` +
    `<div style="font-size:24px;font-weight:800;color:${p.text};${dark ? textGlow(p.accent, 0.15) : ''}">${escHtml(typeof centerTotal === 'string' ? centerTotal : 'Revenue')}</div>` +
    `<div style="font-size:11px;font-weight:600;color:${p.text};opacity:0.5;margin-top:2px;letter-spacing:0.5px">Total</div></div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05)}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${cardsHtml}
  ${centerHtml}
</div>`;
}


// ── CUSTOMER_JOURNEY ──────────────────────────────────────────────
// Bold horizontal funnel with taller bars, glow shadows, glass conversion badges, glass detail cards

function buildCustomerJourney(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  interface Stage { name: string; metric: string; conversion: string; }
  const stages: Stage[] = [];
  for (const line of lines) {
    const m = line.match(/^(.+?):\s*(.+?)\s*\((\d+%?)\)/);
    if (m) stages.push({ name: m[1].trim(), metric: m[2].trim(), conversion: m[3] });
    else if (line.includes(':')) {
      const parts = line.split(':');
      stages.push({ name: parts[0].trim(), metric: parts.slice(1).join(':').trim(), conversion: '' });
    }
  }
  if (stages.length === 0) {
    stages.push({ name: 'Awareness', metric: '100K visitors', conversion: '100%' });
    stages.push({ name: 'Interest', metric: '12K signups', conversion: '12%' });
    stages.push({ name: 'Decision', metric: '2K trials', conversion: '17%' });
    stages.push({ name: 'Action', metric: '400 paying', conversion: '20%' });
  }
  const n = Math.min(stages.length, 6);

  // Extract numeric percentages for bar widths
  const pcts: number[] = [];
  for (let i = 0; i < n; i++) {
    const pctStr = stages[i].conversion.replace('%', '');
    const pctVal = parseFloat(pctStr);
    pcts.push(isNaN(pctVal) ? (100 - i * 20) : pctVal);
  }
  const maxPct = Math.max(...pcts, 1);

  // Layout
  const barAreaTop = PAD + 95;
  const barAreaLeft = PAD + 10;
  const barAreaW = cW - PAD * 2 - 20;
  const barMaxW = Math.round(barAreaW * 0.92);
  const barMinW = Math.round(barAreaW * 0.12);
  const barH = 54;
  const barGap = 10;
  const totalBarHeight = n * barH + (n - 1) * barGap;
  const detailCardTop = barAreaTop + totalBarHeight + 28;

  // ── SVG defs: gradients, glow filter, blur, dot mesh ──
  let svgInner = '<defs>';
  svgInner += `<filter id="cjglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgInner += `<filter id="cjblur"><feGaussianBlur stdDeviation="4"/></filter>`;
  svgInner += `<pattern id="cjdot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  for (let i = 0; i < n; i++) {
    const col = accents[i % accents.length];
    svgInner += `<linearGradient id="cjbar${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${hexToRgba(col, 0.4)}"/></linearGradient>`;
  }
  svgInner += '</defs>';

  // Dot mesh background
  svgInner += `<rect x="${PAD}" y="${barAreaTop - 10}" width="${barAreaW + 20}" height="${H - barAreaTop - PAD + 10}" fill="url(#cjdot)" opacity="0.5"/>`;

  let labelsHtml = '';
  for (let i = 0; i < n; i++) {
    const st = stages[i];
    const col = accents[i % accents.length];
    const barW = Math.round(barMinW + (barMaxW - barMinW) * (pcts[i] / maxPct));
    const by = barAreaTop + i * (barH + barGap);
    const bx = barAreaLeft + Math.round((barAreaW - barW) / 2);

    // Glow shadow under bar (blur filter, 0.15 opacity)
    svgInner += `<rect x="${bx + 6}" y="${by + barH - 4}" width="${barW - 12}" height="10" rx="5" fill="${col}" opacity="0.15" filter="url(#cjblur)"/>`;
    // Bar with gradient (taller: 54px)
    svgInner += `<rect x="${bx}" y="${by}" width="${barW}" height="${barH}" rx="10" fill="url(#cjbar${i})" opacity="0.88"/>`;

    // Text inside bars: larger (15px name, 13px metric)
    if (barW > 120) {
      svgInner += `<text x="${bx + 18}" y="${by + barH / 2 + 5}" fill="#fff" font-size="15" font-weight="bold">${escHtml(st.name)}</text>`;
      svgInner += `<text x="${bx + barW - 18}" y="${by + barH / 2 + 5}" text-anchor="end" fill="rgba(255,255,255,0.85)" font-size="13">${escHtml(st.metric)}</text>`;
    } else {
      svgInner += `<text x="${bx + barW / 2}" y="${by + barH / 2 + 5}" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">${escHtml(st.name.slice(0, 12))}</text>`;
    }

    // Glass conversion badge on right with glow border
    const badgeX = bx + barW + 14;
    const badgeY = by + barH / 2;
    const badgeBg = dark ? hexToRgba(p.surface, 0.25) : hexToRgba(p.surface, 0.92);
    const glassB = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.2)};`;
    labelsHtml += `<div style="position:absolute;left:${badgeX}px;top:${badgeY - 14}px;padding:4px 12px;background:${badgeBg};${glassB}border-radius:14px;font-size:13px;font-weight:800;color:${col};box-shadow:0 0 10px ${hexToRgba(col, 0.3)},${cardShadow(2, dark)}">${escHtml(st.conversion || st.metric)}</div>`;

    // Drop-off arrows: larger text (12px), bolder color
    if (i < n - 1) {
      const dropPct = pcts[i] > 0 ? Math.round((1 - pcts[i + 1] / pcts[i]) * 100) : 0;
      if (dropPct > 0) {
        const arrowX = barAreaLeft - 6;
        const arrowY = by + barH + barGap / 2;
        labelsHtml += `<div style="position:absolute;left:${arrowX}px;top:${arrowY - 10}px;font-size:12px;color:${p.error || '#ef4444'};font-weight:800;opacity:0.8">\u2193 -${dropPct}%</div>`;
      }
    }
  }

  // ── Glass detail cards below ──
  const cardW = Math.round((barAreaW - (n - 1) * 12) / n);
  const cardH = Math.min(105, H - detailCardTop - PAD - 10);
  let cardsHtml = '';
  for (let i = 0; i < n; i++) {
    const st = stages[i];
    const col = accents[i % accents.length];
    const cardX = barAreaLeft + i * (cardW + 12);
    const cardBg = dark ? hexToRgba(p.surface, 0.2) : p.surface;
    const glassCard = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.1)};`;
    cardsHtml += `<div style="position:absolute;left:${cardX}px;top:${detailCardTop}px;width:${cardW}px;height:${cardH}px;background:${cardBg};border-radius:12px;border-top:4px solid ${col};${glassCard}box-shadow:${cardShadow(2, dark)};padding:10px 12px;text-align:center">`;
    // Larger numbered circle (36px) with gradient fill
    cardsHtml += `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,${col},${hexToRgba(col, 0.6)});display:inline-flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;margin-bottom:6px">${i + 1}</div>`;
    cardsHtml += `<div style="font-size:13px;font-weight:800;color:${col};margin-bottom:4px;letter-spacing:0.5px">${escHtml(st.name)}</div>`;
    if (st.metric) cardsHtml += `<div style="font-size:17px;font-weight:bold;color:${p.text}">${escHtml(st.metric)}</div>`;
    cardsHtml += `</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05, '35%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${labelsHtml}
  ${cardsHtml}
</div>`;
}


// ── TECH_STACK ──────────────────────────────────────────────
// Bold layered architecture with diamond badges, hex-inspired pills, glass shimmer, dot mesh

function buildTechStack(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  interface Layer { name: string; components: string[]; }
  const layers: Layer[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.slice(0, colonIdx).trim();
      const comps = line.slice(colonIdx + 1).split(',').map(s => s.trim()).filter(Boolean);
      layers.push({ name, components: comps });
    }
  }
  if (layers.length === 0) {
    layers.push({ name: 'Infrastructure', components: ['AWS', 'Kubernetes', 'Terraform'] });
    layers.push({ name: 'Data', components: ['PostgreSQL', 'Redis', 'S3'] });
    layers.push({ name: 'Backend', components: ['NestJS', 'Prisma', 'BullMQ'] });
    layers.push({ name: 'Frontend', components: ['Next.js', 'Tailwind', 'React Query'] });
    layers.push({ name: 'AI/ML', components: ['Claude API', 'LangChain'] });
  }

  const n = layers.length;
  const startY = PAD + 95;
  const availH = H - startY - PAD - 10;
  const bandGap = 12;
  const bandH = Math.min(88, Math.round((availH - (n - 1) * bandGap) / n));
  const bandW = cW - PAD * 2;
  const labelColW = 155;

  // ── SVG defs: gradients, glow, dot mesh, glass shimmer ──
  let svgInner = '<defs>';
  svgInner += `<filter id="tsglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgInner += `<pattern id="tsdot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  for (let i = 0; i < n; i++) {
    const col = accents[i % accents.length];
    svgInner += `<linearGradient id="tsg${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${hexToRgba(col, dark ? 0.2 : 0.12)}"/><stop offset="100%" stop-color="${hexToRgba(col, 0.02)}"/></linearGradient>`;
    // Glass shimmer gradient per band (vertical: white 6% to transparent)
    svgInner += `<linearGradient id="tsshim${i}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.06)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>`;
  }
  svgInner += '</defs>';

  // Dot mesh background
  svgInner += `<rect x="${PAD}" y="${startY - 10}" width="${bandW}" height="${availH + 20}" fill="url(#tsdot)" opacity="0.5"/>`;

  let bandsHtml = '';
  // Render bottom-to-top: layers[0] = bottom = infra
  for (let i = 0; i < n; i++) {
    const layer = layers[n - 1 - i];
    const col = accents[(n - 1 - i) % accents.length];
    const by = startY + i * (bandH + bandGap);
    const cardBg = dark ? hexToRgba(p.surface, 0.2) : p.surface;
    const glassBorder = dark ? `border:1px solid rgba(255,255,255,0.12);` : `border:1px solid ${hexToRgba(p.border, 0.1)};`;

    // Band background (glass card style)
    svgInner += `<rect x="${PAD}" y="${by}" width="${bandW}" height="${bandH}" rx="14" fill="${cardBg}" stroke="${hexToRgba(p.border, 0.08)}" stroke-width="1"/>`;
    // Horizontal gradient overlay
    svgInner += `<rect x="${PAD}" y="${by}" width="${bandW}" height="${bandH}" rx="14" fill="url(#tsg${n - 1 - i})"/>`;
    // Glass shimmer overlay
    svgInner += `<rect x="${PAD}" y="${by}" width="${bandW}" height="${bandH}" rx="14" fill="url(#tsshim${n - 1 - i})"/>`;
    // Left accent bar (thicker: 7px)
    svgInner += `<rect x="${PAD}" y="${by}" width="7" height="${bandH}" rx="3.5" fill="${col}" opacity="0.9"/>`;
    // Shadow at bottom of band
    svgInner += `<rect x="${PAD + 10}" y="${by + bandH}" width="${bandW - 20}" height="5" rx="2.5" fill="${hexToRgba(col, 0.1)}"/>`;

    // ── Diamond-shaped layer number badge (SVG polygon) ──
    const iconCx = PAD + 34;
    const iconCy = by + bandH / 2;
    const ds = 18; // diamond half-size
    svgInner += `<polygon points="${iconCx},${iconCy - ds} ${iconCx + ds},${iconCy} ${iconCx},${iconCy + ds} ${iconCx - ds},${iconCy}" fill="linear-gradient(135deg,${col},${hexToRgba(col, 0.6)})" opacity="0.15"/>`;
    svgInner += `<polygon points="${iconCx},${iconCy - ds} ${iconCx + ds},${iconCy} ${iconCx},${iconCy + ds} ${iconCx - ds},${iconCy}" fill="none" stroke="${col}" stroke-width="2"/>`;
    svgInner += `<text x="${iconCx}" y="${iconCy + 5}" text-anchor="middle" fill="${col}" font-size="15" font-weight="800">${n - i}</text>`;

    // Layer name (bolder)
    bandsHtml += `<div style="position:absolute;left:${PAD + 58}px;top:${iconCy - 12}px;width:${labelColW - 40}px">`;
    bandsHtml += `<div style="font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${col}">${escHtml(layer.name)}</div>`;
    bandsHtml += `</div>`;

    // ── Hexagonal-inspired pill component badges with gradient initial circles (32px) ──
    const badgeLeft = PAD + labelColW + 20;
    let bx = badgeLeft;
    const badgeY = by + Math.round((bandH - 40) / 2);
    const maxBadgeW = PAD + bandW - 16;
    for (const comp of layer.components.slice(0, 5)) {
      const textW = comp.length * 7.5 + 52;
      const bw = Math.min(148, textW);
      if (bx + bw > maxBadgeW) break;
      const pillBg = dark ? hexToRgba(p.surface, 0.35) : '#fff';
      const pillBorder = dark ? 'border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.2)};`;
      const blurCSS = dark ? 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' : '';
      bandsHtml += `<div style="position:absolute;left:${bx}px;top:${badgeY}px;height:40px;padding:0 14px 0 6px;background:${pillBg};${pillBorder}${blurCSS}border-radius:20px;display:flex;align-items:center;box-shadow:${cardShadow(2, dark)}">`;
      // Gradient initial circle (32px)
      bandsHtml += `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${col},${hexToRgba(col, 0.6)});display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;margin-right:8px">${escHtml(comp.charAt(0).toUpperCase())}</div>`;
      bandsHtml += `<span style="font-size:12px;font-weight:700;color:${dark ? '#fff' : p.text};white-space:nowrap;letter-spacing:0.3px">${escHtml(comp)}</span>`;
      bandsHtml += `</div>`;
      bx += bw + 10;
    }

    // ── Vertical flow connector dots between layers ──
    if (i < n - 1) {
      const connMid = PAD + bandW * 0.5;
      const connY1 = by + bandH + 2;
      const connY2 = connY1 + bandGap - 4;
      const nextCol = accents[(n - 2 - i) % accents.length];
      // Three dots vertically
      const dotSpacing = (connY2 - connY1) / 4;
      for (let d = 1; d <= 3; d++) {
        svgInner += `<circle cx="${connMid}" cy="${connY1 + dotSpacing * d}" r="2.5" fill="${hexToRgba(nextCol, 0.35)}"/>`;
      }
      // Side connector lines
      svgInner += `<line x1="${PAD + bandW * 0.35}" y1="${connY1}" x2="${PAD + bandW * 0.35}" y2="${connY2}" stroke="${hexToRgba(p.border, 0.12)}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
      svgInner += `<line x1="${PAD + bandW * 0.65}" y1="${connY1}" x2="${PAD + bandW * 0.65}" y2="${connY2}" stroke="${hexToRgba(p.border, 0.12)}" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    }
  }

  // ── "ARCHITECTURE" rotated text annotation on right edge ──
  const archX = cW - PAD + 8;
  const archY = startY + Math.round(n * (bandH + bandGap) / 2);
  svgInner += `<text x="${archX}" y="${archY}" text-anchor="middle" fill="${hexToRgba(p.text, 0.08)}" font-size="12" font-weight="800" letter-spacing="3" transform="rotate(-90 ${archX} ${archY})">ARCHITECTURE</text>`;

  // ── Vertical arrow with labels (Users up, Infra down) on left edge ──
  const arrowX = PAD - 16;
  const arrowTop = startY + 10;
  const arrowBot = startY + n * (bandH + bandGap) - bandGap - 10;
  svgInner += `<line x1="${arrowX}" y1="${arrowTop}" x2="${arrowX}" y2="${arrowBot}" stroke="${hexToRgba(p.text, 0.12)}" stroke-width="2"/>`;
  svgInner += `<polygon points="${arrowX - 4},${arrowTop + 6} ${arrowX + 4},${arrowTop + 6} ${arrowX},${arrowTop}" fill="${hexToRgba(p.text, 0.15)}"/>`;
  svgInner += `<polygon points="${arrowX - 4},${arrowBot - 6} ${arrowX + 4},${arrowBot - 6} ${arrowX},${arrowBot}" fill="${hexToRgba(p.text, 0.15)}"/>`;
  bandsHtml += `<div style="position:absolute;left:${arrowX - 20}px;top:${arrowTop - 16}px;width:40px;text-align:center;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${p.text};opacity:0.35">\u2191 Users</div>`;
  bandsHtml += `<div style="position:absolute;left:${arrowX - 20}px;top:${arrowBot + 6}px;width:40px;text-align:center;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${p.text};opacity:0.35">\u2193 Infra</div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${bandsHtml}
</div>`;
}


// ── GROWTH_LOOPS ──────────────────────────────────────────────
// Orbital ring system with glow arcs, satellite nodes, glass label cards, particle trails

function buildGrowthLoops(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const raw = slide.body.replace(/\u2192/g, '\u2192');
  const nodes = raw.split(/\u2192|->|=>/).map(s => s.trim()).filter(Boolean);
  const n = Math.min(nodes.length, 8) || 4;
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);
  const dark = isDarkBackground(p.background);

  const cx = Math.round(cW * 0.50);
  const cy = Math.round(H * 0.52);
  const R = Math.min(Math.round(cW * 0.22), 195);

  // ── SVG defs: gradients, glow filters, dot mesh ──
  let svgDefs = '<defs>';
  svgDefs += `<filter id="glglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<filter id="glorng"><feGaussianBlur stdDeviation="8"/></filter>`;
  svgDefs += `<pattern id="gldot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  for (let i = 0; i < n; i++) {
    const col = accents[i % accents.length];
    const col2 = accents[(i + 1) % accents.length];
    svgDefs += `<linearGradient id="glg${i}" gradientUnits="userSpaceOnUse" x1="${(cx + R * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2)).toFixed(0)}" y1="${(cy + R * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2)).toFixed(0)}" x2="${(cx + R * Math.cos(((i + 1) / n) * Math.PI * 2 - Math.PI / 2)).toFixed(0)}" y2="${(cy + R * Math.sin(((i + 1) / n) * Math.PI * 2 - Math.PI / 2)).toFixed(0)}"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${col2}"/></linearGradient>`;
    // Radial gradient for node fill
    svgDefs += `<radialGradient id="glnf${i}" cx="40%" cy="40%"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${hexToRgba(col, 0.7)}"/></radialGradient>`;
  }
  svgDefs += '</defs>';

  let svgInner = svgDefs;

  // Dot mesh background
  svgInner += `<rect x="${PAD}" y="${PAD}" width="${cW - PAD * 2}" height="${H - PAD * 2}" fill="url(#gldot)" opacity="0.5"/>`;

  // ── 4 concentric orbital rings ──
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R + 40}" fill="none" stroke="${hexToRgba(p.accent, 0.04)}" stroke-width="1" stroke-dasharray="6,10"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R + 25}" fill="none" stroke="${hexToRgba(p.accent, 0.06)}" stroke-width="1" stroke-dasharray="4,8"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${hexToRgba(p.accent, 0.03)}" stroke-width="1" stroke-dasharray="2,6"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R - 25}" fill="none" stroke="${hexToRgba(p.accent, 0.05)}" stroke-width="1" stroke-dasharray="3,6"/>`;

  // ── Outer glow ring: thick blurred ring ──
  svgInner += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${hexToRgba(p.accent, 0.08)}" stroke-width="18" filter="url(#glorng)"/>`;

  // ── Arc segments: 6px main + 16px glow backing, with gap ──
  const arcGap = 0.10;
  const arcSpan = (2 * Math.PI / n) - arcGap;
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2 - Math.PI / 2 + arcGap / 2;
    const a2 = a1 + arcSpan;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const large = arcSpan > Math.PI ? 1 : 0;
    const col = accents[i % accents.length];

    // 16px glow backing
    svgInner += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${hexToRgba(col, 0.1)}" stroke-width="16" stroke-linecap="round"/>`;
    // 6px main arc
    svgInner += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="url(#glg${i})" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;

    // Particle trail dots (2-3 along each arc)
    for (let d = 0; d < 3; d++) {
      const t = 0.15 + d * 0.3;
      const pa = a1 + arcSpan * t;
      const pr = R + (d % 2 === 0 ? 20 : -16);
      const px = cx + pr * Math.cos(pa), py = cy + pr * Math.sin(pa);
      svgInner += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${1.2 + d * 0.4}" fill="${hexToRgba(col, 0.22)}"/>`;
    }

    // Arrowhead at end
    const sz = 14;
    const dx = x2 - (cx + R * Math.cos(a2 - 0.1)), dy = y2 - (cy + R * Math.sin(a2 - 0.1));
    const dl = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dl, uy = dy / dl;
    const col2 = accents[(i + 1) % accents.length];
    svgInner += `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 - ux * sz - uy * sz * 0.5).toFixed(1)},${(y2 - uy * sz + ux * sz * 0.5).toFixed(1)} ${(x2 - ux * sz + uy * sz * 0.5).toFixed(1)},${(y2 - uy * sz - ux * sz * 0.5).toFixed(1)}" fill="${col2}" opacity="0.9"/>`;
  }

  // ── Satellite node circles: outer glow (r+6), ring (r=34), inner filled (r=26) with radial gradient + glow filter ──
  let nodesHtml = '';
  const nodeCardR = R + 65;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + R * Math.cos(a), ny = cy + R * Math.sin(a);
    const col = accents[i % accents.length];

    // Outer glow halo
    svgInner += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="40" fill="${hexToRgba(col, 0.06)}" filter="url(#glglo)"/>`;
    // Ring (r=34)
    svgInner += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="34" fill="none" stroke="${hexToRgba(col, 0.2)}" stroke-width="2"/>`;
    // Inner filled (r=26) with radial gradient + glow
    svgInner += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="26" fill="url(#glnf${i})" filter="url(#glglo)"/>`;
    // Step number inside
    svgInner += `<text x="${nx.toFixed(1)}" y="${(ny + 6).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${i + 1}</text>`;

    // ── Glass label card with connector ──
    const lx = cx + nodeCardR * Math.cos(a);
    const ly = cy + nodeCardR * Math.sin(a);
    const align = lx < cx ? 'right' : 'left';
    const cardW = 170;
    const leftPos = align === 'right' ? lx - cardW : lx;
    const cardBg = dark ? hexToRgba(p.surface, 0.22) : hexToRgba(p.surface, 0.92);
    const glassBorder = dark ? 'border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.15)};`;
    const blurCSS = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' : '';

    // Dashed connector from node to label card
    const connInnerX = cx + (R + 38) * Math.cos(a), connInnerY = cy + (R + 38) * Math.sin(a);
    const connOuterX = cx + (nodeCardR - 14) * Math.cos(a), connOuterY = cy + (nodeCardR - 14) * Math.sin(a);
    svgInner += `<line x1="${connInnerX.toFixed(1)}" y1="${connInnerY.toFixed(1)}" x2="${connOuterX.toFixed(1)}" y2="${connOuterY.toFixed(1)}" stroke="${hexToRgba(col, 0.25)}" stroke-width="1.5" stroke-dasharray="4,4"/>`;

    nodesHtml += `<div style="position:absolute;left:${Math.round(leftPos)}px;top:${Math.round(ly - 20)}px;width:${cardW}px;padding:8px 12px;background:${cardBg};${glassBorder}${blurCSS}border-left:3px solid ${col};border-radius:10px;box-shadow:${cardShadow(2, dark)};text-align:${align === 'right' ? 'right' : 'left'}">`;
    nodesHtml += `<div style="display:flex;align-items:center;${align === 'right' ? 'flex-direction:row-reverse;' : ''}gap:6px">`;
    nodesHtml += `<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,${col},${hexToRgba(col, 0.6)});flex-shrink:0"></div>`;
    nodesHtml += `<span style="font-size:13px;font-weight:800;color:${col};letter-spacing:0.5px;line-height:1.3">${escHtml(nodes[i] || 'Step ' + (i + 1))}</span>`;
    nodesHtml += `</div></div>`;
  }

  // ── Center: 3 rings (r=46,34,22) + infinity + GROWTH label ──
  svgInner += `<circle cx="${cx}" cy="${cy}" r="46" fill="${hexToRgba(p.accent, 0.04)}" stroke="${hexToRgba(p.accent, 0.1)}" stroke-width="2"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="34" fill="${hexToRgba(p.accent, 0.08)}" stroke="${hexToRgba(p.accent, 0.15)}" stroke-width="1.5"/>`;
  svgInner += `<circle cx="${cx}" cy="${cy}" r="22" fill="${p.accent}" opacity="0.2" filter="url(#glglo)"/>`;
  const centerHtml = `<div style="position:absolute;left:${cx - 38}px;top:${cy - 18}px;width:76px;text-align:center">` +
    `<div style="font-size:22px;font-weight:bold;color:${p.accent};${dark ? textGlow(p.accent, 0.3) : ''}">\u221E</div>` +
    `<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${p.accent};opacity:0.6;margin-top:-3px">GROWTH</div></div>`;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05)}
  <div style="position:absolute;left:${PAD}px;top:${PAD - 6}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 48}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${nodesHtml}
  ${centerHtml}
</div>`;
}


// ── CASE_STUDY ──────────────────────────────────────────────
// Glass client bar + giant decorative quote mark + bold KPI cards with glow

function buildCaseStudy(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  const clientName = lines[0] || 'Client';
  let quote = '';
  const kpis: { label: string; value: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if ((line.startsWith('"') || line.startsWith('\u201c')) && !quote) {
      quote = line.replace(/^["\u201c]+/, '').replace(/["\u201d]+$/, '').trim();
    } else if (line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const label = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      if (label && val) kpis.push({ label, value: val });
    }
  }

  const quoteY = PAD + 165;
  const kpiY = H - PAD - 120;
  const kpiCount = Math.min(kpis.length, 4);
  const kpiGap = 14;
  const kpiW = kpiCount > 0 ? Math.round((cW - PAD * 2 - (kpiCount - 1) * kpiGap) / kpiCount) : 0;
  const accents = cardAccentColors(p, colorOffset(slide.title));

  // ── SVG defs: glow filter, dot mesh ──
  const svgDefs = `<defs>` +
    `<filter id="csglo"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<pattern id="csdot" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.7" fill="${hexToRgba(p.text, 0.06)}"/></pattern>` +
    `</defs>`;
  let svgInner = svgDefs;
  // Dot mesh background
  svgInner += `<rect x="${PAD}" y="${PAD}" width="${cW - PAD * 2}" height="${H - PAD * 2}" fill="url(#csdot)" opacity="0.5"/>`;
  // SVG horizontal separator line between quote and KPIs
  svgInner += `<line x1="${PAD + 20}" y1="${kpiY - 20}" x2="${cW - PAD - 20}" y2="${kpiY - 20}" stroke="${hexToRgba(p.accent, 0.15)}" stroke-width="2" stroke-dasharray="8,6"/>`;

  // ── Client bar: glass style with gradient fill, larger avatar (44px) ──
  const clientBarBg = dark ? hexToRgba(p.surface, 0.2) : hexToRgba(p.accent, 0.06);
  const clientGlass = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(p.accent, 0.12)};`;
  const clientBarHtml = `<div style="position:absolute;left:${PAD}px;top:${PAD + 78}px;width:${cW - PAD * 2}px;height:56px;background:linear-gradient(135deg,${clientBarBg},${hexToRgba(p.accent, dark ? 0.08 : 0.03)});${clientGlass}border-radius:14px;display:flex;align-items:center;padding:0 20px;box-shadow:${cardShadow(2, dark)}">` +
    `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${p.accent},${hexToRgba(p.accent, 0.6)});display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff">${escHtml(clientName.charAt(0).toUpperCase())}</div>` +
    `<div style="margin-left:14px;font-size:20px;font-weight:800;color:${p.text};letter-spacing:0.5px">${escHtml(clientName)}</div></div>`;

  // ── Giant decorative SVG quotation mark (100px tall, accent at 0.06 opacity) positioned top-right of quote area ──
  const quoteMarkX = cW - PAD - 120;
  const quoteMarkY = quoteY - 10;
  svgInner += `<text x="${quoteMarkX}" y="${quoteMarkY + 80}" font-size="100" font-weight="900" fill="${hexToRgba(p.accent, 0.06)}" font-family="Georgia,serif">\u201C</text>`;

  // ── Quote text: larger (18px), italic, line-height 1.8 ──
  const quoteHtml = `<div style="position:absolute;left:${PAD + 12}px;top:${quoteY}px;width:${cW - PAD * 2 - 40}px">` +
    `<svg width="40" height="30" viewBox="0 0 36 28" style="margin-bottom:-4px"><path d="M0 18C0 8 6 2 14 0l2 4C10 6 8 10 8 14h6v14H0V18zm20 0C20 8 26 2 34 0l2 4C30 6 28 10 28 14h6v14H20V18z" fill="${hexToRgba(p.accent, 0.25)}"/></svg>` +
    `<div style="font-size:18px;font-style:italic;color:${p.text};opacity:0.88;line-height:1.8;padding-left:6px">${escHtml(quote)}</div></div>`;

  // ── KPI cards: glass style, cardShadow(2), larger value (30px, weight 800), glow on stat, gradient top border ──
  let kpiHtml = '';
  for (let i = 0; i < kpiCount; i++) {
    const kpi = kpis[i];
    const kx = PAD + i * (kpiW + kpiGap);
    const col = accents[i % accents.length];
    const cardBg = dark ? hexToRgba(p.surface, 0.22) : p.surface;
    const glassKpi = dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);' : `border:1px solid ${hexToRgba(col, 0.1)};`;
    kpiHtml += `<div style="position:absolute;left:${kx}px;top:${kpiY}px;width:${kpiW}px;height:110px;background:${cardBg};border-top:4px solid transparent;background-clip:padding-box;${glassKpi}border-radius:14px;box-shadow:${cardShadow(2, dark)};padding:14px 16px;position:relative;overflow:hidden">`;
    // Gradient accent top border (via pseudo overlay)
    kpiHtml += `<div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${col},${hexToRgba(col, 0.6)});border-radius:14px 14px 0 0"></div>`;
    // Value with glow
    kpiHtml += `<div style="font-size:30px;font-weight:800;color:${col};${dark ? `text-shadow:0 0 12px ${hexToRgba(col, 0.3)}` : ''};margin-top:4px">${escHtml(kpi.value)}</div>`;
    kpiHtml += `<div style="font-size:12px;font-weight:600;color:${p.text};opacity:0.6;margin-top:6px;letter-spacing:0.3px">${escHtml(kpi.label)}</div>`;
    kpiHtml += `</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.05, '30%')}
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;color:${p.text};line-height:1.2;letter-spacing:1px;${dark ? textGlow(p.accent, 0.2) : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:50px;height:4px;background:${p.accent};border-radius:2px"></div>
  ${clientBarHtml}
  ${quoteHtml}
  ${kpiHtml}
</div>`;
}


// ── HIRING_PLAN ──────────────────────────────────────────────
// Vertical column timeline with quarter cards and role badges — BOLD edition

function buildHiringPlan(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  const quarters: { label: string; roles: string[] }[] = [];
  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const label = line.slice(0, sep).trim();
      const roles = line.slice(sep + 1).split(',').map(r => r.trim()).filter(Boolean);
      if (roles.length > 0) quarters.push({ label, roles });
    }
  }
  if (quarters.length === 0) {
    quarters.push({ label: 'Q1 2026', roles: ['Engineer', 'Designer'] });
    quarters.push({ label: 'Q2 2026', roles: ['PM', 'Sales', 'DevRel'] });
    quarters.push({ label: 'Q3 2026', roles: ['3x Engineers', 'CS'] });
  }

  const count = Math.min(quarters.length, 6);
  const colGap = 14;
  const colW = Math.round((cW - PAD * 2 - (count - 1) * colGap) / count);
  const colTop = PAD + 95;
  const colH = H - colTop - PAD - 10;

  // ── SVG defs: glow filter, gradient timeline line, dot mesh ──
  let svgDefs = `<defs>`;
  svgDefs += `<filter id="hpglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<linearGradient id="hpLineGrad" x1="0" y1="0" x2="1" y2="0">`;
  for (let i = 0; i < count; i++) {
    svgDefs += `<stop offset="${Math.round(i / Math.max(count - 1, 1) * 100)}%" stop-color="${accents[i % accents.length]}"/>`;
  }
  svgDefs += `</linearGradient>`;
  svgDefs += `<pattern id="hpDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgDefs += `</defs>`;

  let html = '';
  // Dot mesh background
  html += `<svg style="position:absolute;left:${PAD}px;top:${colTop}px;width:${cW - PAD * 2}px;height:${colH + 20}px;pointer-events:none"><rect width="100%" height="100%" fill="url(#hpDots)"/></svg>`;

  // Horizontal timeline line at top of columns — gradient + glow
  html += `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none">`;
  html += svgDefs;
  const lineY = colTop - 4;
  // Glow line behind
  html += `<line x1="${PAD + colW / 2}" y1="${lineY}" x2="${PAD + (count - 1) * (colW + colGap) + colW / 2}" y2="${lineY}" stroke="${hexToRgba(p.accent, 0.25)}" stroke-width="8" filter="url(#hpglo)"/>`;
  // Main gradient line
  html += `<line x1="${PAD + colW / 2}" y1="${lineY}" x2="${PAD + (count - 1) * (colW + colGap) + colW / 2}" y2="${lineY}" stroke="url(#hpLineGrad)" stroke-width="3"/>`;
  for (let i = 0; i < count; i++) {
    const dotX = PAD + i * (colW + colGap) + colW / 2;
    const col = accents[i % accents.length];
    // Glow halo ring
    html += `<circle cx="${dotX}" cy="${lineY}" r="14" fill="${hexToRgba(col, 0.15)}" filter="url(#hpglo)"/>`;
    // Main node
    html += `<circle cx="${dotX}" cy="${lineY}" r="10" fill="${col}"/>`;
    // Inner dot
    html += `<circle cx="${dotX}" cy="${lineY}" r="4" fill="#fff" opacity="0.9"/>`;
  }
  html += `</svg>`;

  for (let i = 0; i < count; i++) {
    const q = quarters[i];
    const color = accents[i % accents.length];
    const cx = PAD + i * (colW + colGap);
    const glassProps = dark
      ? `background:${hexToRgba(p.surface, 0.18)};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12)`
      : `background:${p.surface};border:1px solid ${hexToRgba(p.border, 0.15)}`;

    // Quarter card — glass style
    html += `<div style="position:absolute;left:${cx}px;top:${colTop + 8}px;width:${colW}px;height:${colH - 8}px;${glassProps};border-radius:14px;border-top:4px solid ${color};box-shadow:${cardShadow(2, dark)}">`;
    // Top accent stripe
    html += `<div style="position:absolute;top:0;left:0;width:100%;height:6px;background:linear-gradient(90deg,${hexToRgba(color, 0.15)},transparent);border-radius:14px 14px 0 0;pointer-events:none"></div>`;
    html += `</div>`;

    // Quarter label — bold
    html += `<div style="position:absolute;left:${cx}px;top:${colTop + 20}px;width:${colW}px;text-align:center;font-size:16px;font-weight:800;letter-spacing:1px;color:${color};${dark ? `text-shadow:${textGlow(color, 0.6)}` : ''}">${escHtml(q.label)}</div>`;

    // Headcount badge — glass gradient
    html += `<div style="position:absolute;left:${cx + colW - 42}px;top:${colTop + 18}px;width:34px;height:22px;background:linear-gradient(135deg,${color},${hexToRgba(color, 0.6)});border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;box-shadow:0 2px 8px ${hexToRgba(color, 0.35)}">${q.roles.length}</div>`;

    // Role pills — gradient fills
    const pillTop = colTop + 52;
    const pillH = 36;
    const pillGap = 8;
    for (let r = 0; r < Math.min(q.roles.length, 6); r++) {
      const py = pillTop + r * (pillH + pillGap);
      if (py + pillH > colTop + colH - 10) break;
      html += `<div style="position:absolute;left:${cx + 10}px;top:${py}px;width:${colW - 20}px;height:${pillH}px;background:linear-gradient(135deg,${hexToRgba(color, dark ? 0.22 : 0.12)},${hexToRgba(color, dark ? 0.08 : 0.03)});border:1px solid ${hexToRgba(color, 0.25)};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${dark ? '#fff' : color};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;box-shadow:${cardShadow(1, dark)}">${escHtml(q.roles[r])}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.07, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  ${html}
</div>`;
}


// ── USE_OF_FUNDS ─────────────────────────────────────────────
// Wide horizontal stacked bar with gradient segments + category cards — BOLD edition

function buildUseOfFunds(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  const items: { name: string; amount: string; pct: number }[] = [];
  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const name = line.slice(0, sep).trim();
      const rest = line.slice(sep + 1).trim();
      const pctMatch = rest.match(/(\d+)\s*%/);
      const amtMatch = rest.match(/(\$[\d,.]+[KMB]?)/i);
      if (pctMatch) items.push({ name, amount: amtMatch ? amtMatch[1] : '', pct: parseInt(pctMatch[1], 10) });
    }
  }
  if (items.length === 0) {
    items.push({ name: 'Engineering', amount: '$2M', pct: 40 });
    items.push({ name: 'Sales', amount: '$1.5M', pct: 30 });
    items.push({ name: 'Marketing', amount: '$1M', pct: 20 });
    items.push({ name: 'Operations', amount: '$500K', pct: 10 });
  }

  const count = Math.min(items.length, 8);
  const barTop = PAD + 115;
  const barH = 56;
  const barLeft = PAD + 10;
  const barW = cW - PAD * 2 - 20;
  const totalPct = items.slice(0, count).reduce((s, it) => s + it.pct, 0) || 100;
  const totalAmount = items.slice(0, count).map(it => it.amount).filter(Boolean).join(' + ');

  // ── SVG defs ──
  let svgDefs = `<defs>`;
  svgDefs += `<filter id="uofglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<pattern id="uofDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  for (let i = 0; i < count; i++) {
    const col = accents[i % accents.length];
    svgDefs += `<linearGradient id="uofSeg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}"/><stop offset="100%" stop-color="${hexToRgba(col, 0.7)}"/></linearGradient>`;
  }
  svgDefs += `</defs>`;

  // Dot mesh background
  let html = '';
  html += `<svg style="position:absolute;left:${PAD}px;top:${barTop - 10}px;width:${cW - PAD * 2}px;height:${H - barTop + 10 - PAD}px;pointer-events:none"><rect width="100%" height="100%" fill="url(#uofDots)"/></svg>`;

  // Total sum above bar
  if (totalAmount) {
    html += `<div style="position:absolute;left:${barLeft}px;top:${barTop - 30}px;font-size:22px;font-weight:800;color:${p.accent};letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.5)}` : ''}">${escHtml(totalAmount)}</div>`;
  }

  // Stacked bar SVG — taller with glow edges
  let barSvg = `<svg style="position:absolute;left:${barLeft}px;top:${barTop}px;width:${barW}px;height:${barH + 8}px" viewBox="0 0 ${barW} ${barH + 8}">`;
  barSvg += svgDefs;
  // 3D shadow bar behind
  barSvg += `<rect x="2" y="4" width="${barW - 4}" height="${barH}" rx="12" fill="${hexToRgba('#000', 0.1)}"/>`;
  let bx = 0;
  for (let i = 0; i < count; i++) {
    const segW = Math.round(barW * items[i].pct / totalPct);
    const isFirst = i === 0, isLast = i === count - 1;
    barSvg += `<rect x="${bx}" y="0" width="${segW}" height="${barH}" fill="url(#uofSeg${i})" ${isFirst ? 'rx="12"' : ''} ${isLast ? 'rx="12"' : ''}/>`;
    // Glow edge between segments
    if (i > 0) {
      barSvg += `<line x1="${bx}" y1="0" x2="${bx}" y2="${barH}" stroke="#fff" stroke-width="1" opacity="0.4"/>`;
    }
    // Percentage label
    if (segW > 50) {
      barSvg += `<text x="${bx + segW / 2}" y="${barH / 2 + 6}" text-anchor="middle" fill="#fff" font-size="15" font-weight="bold">${items[i].pct}%</text>`;
    }
    bx += segW;
  }
  barSvg += `</svg>`;

  // Category cards below bar
  const cardTop = barTop + barH + 36;
  const cardGap = 12;
  const cols = Math.min(count, 4);
  const rows = Math.ceil(count / cols);
  const cardW = Math.round((barW - (cols - 1) * cardGap) / cols);
  const cardH = Math.min(96, Math.round((H - cardTop - PAD - (rows - 1) * cardGap) / rows));

  let cardsHtml = '';
  for (let i = 0; i < count; i++) {
    const it = items[i];
    const col_idx = i % cols;
    const row = Math.floor(i / cols);
    const cx = barLeft + col_idx * (cardW + cardGap);
    const cy = cardTop + row * (cardH + cardGap);
    const color = accents[i % accents.length];
    const glassProps = dark
      ? `background:${hexToRgba(p.surface, 0.18)};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12)`
      : `background:${p.surface};border:1px solid ${hexToRgba(p.border, 0.15)}`;

    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;${glassProps};border-radius:14px;box-shadow:${cardShadow(2, dark)};padding:10px 14px;overflow:hidden">`;
    // Top accent stripe
    cardsHtml += `<div style="position:absolute;top:0;left:0;width:100%;height:5px;background:linear-gradient(90deg,${color},${hexToRgba(color, 0.2)});border-radius:14px 14px 0 0;pointer-events:none"></div>`;
    // Header row
    cardsHtml += `<div style="display:flex;align-items:center;margin-bottom:6px;margin-top:2px"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,${color},${hexToRgba(color, 0.6)});margin-right:8px;flex-shrink:0"></span><span style="font-size:13px;font-weight:800;color:${p.text};letter-spacing:0.5px">${escHtml(it.name)}</span></div>`;
    if (it.amount) cardsHtml += `<div style="font-size:22px;font-weight:800;color:${color};${dark ? `text-shadow:${textGlow(color, 0.4)}` : ''}">${escHtml(it.amount)}</div>`;
    // Progress bar inside card
    cardsHtml += `<div style="position:absolute;bottom:10px;left:14px;right:14px;height:8px;background:${hexToRgba(color, 0.1)};border-radius:4px;overflow:hidden"><div style="width:${it.pct}%;height:100%;background:linear-gradient(90deg,${color},${hexToRgba(color, 0.6)});border-radius:4px"></div></div>`;
    cardsHtml += `<div style="font-size:11px;color:${p.text};opacity:0.6;margin-top:2px;font-weight:600">${it.pct}% of total</div>`;
    cardsHtml += `</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.07, '35%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  ${barSvg}
  ${cardsHtml}
</div>`;
}


// ── RISK_MITIGATION ──────────────────────────────────────────
// Two columns: risk cards (red) with SVG arrow to mitigation cards (green) — BOLD edition

function buildRiskMitigation(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  const pairs: { risk: string; mitigation: string }[] = [];
  for (const line of lines) {
    const arrowMatch = line.match(/^(.+?)\s*(?:\u2192|->|=>|\u2794)\s*(.+)$/);
    if (arrowMatch) { pairs.push({ risk: arrowMatch[1].trim(), mitigation: arrowMatch[2].trim() }); continue; }
    const sepIdx = line.indexOf(':');
    if (sepIdx > 0 && sepIdx < line.length - 1) pairs.push({ risk: line.slice(0, sepIdx).trim(), mitigation: line.slice(sepIdx + 1).trim() });
  }
  if (pairs.length === 0) {
    pairs.push({ risk: 'Market risk', mitigation: 'Diversified revenue streams' });
    pairs.push({ risk: 'Tech risk', mitigation: 'Proven tech stack' });
    pairs.push({ risk: 'Key person risk', mitigation: 'Cross-training program' });
  }

  const count = Math.min(pairs.length, 5);
  const headerY = PAD + 80;
  const rowTop = headerY + 44;
  const totalW = cW - PAD * 2;
  const arrowZone = 64;
  const colW = Math.round((totalW - arrowZone) / 2);
  const rowGap = 10;
  const rowH = Math.min(90, Math.round((H - rowTop - PAD - (count - 1) * rowGap) / count));
  const leftX = PAD;
  const rightX = PAD + colW + arrowZone;

  const riskColor = p.error || '#ef4444';
  const mitigColor = p.success || '#22c55e';

  // ── SVG defs: glow, arrow gradient, dot mesh ──
  let svgBlock = `<svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">`;
  svgBlock += `<defs>`;
  svgBlock += `<filter id="rmglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgBlock += `<linearGradient id="rmArrowGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${riskColor}"/><stop offset="100%" stop-color="${mitigColor}"/></linearGradient>`;
  svgBlock += `<pattern id="rmDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgBlock += `</defs>`;
  // Dot mesh
  svgBlock += `<rect x="${PAD}" y="${rowTop}" width="${totalW}" height="${H - rowTop - PAD}" fill="url(#rmDots)"/>`;

  // Arrow connectors for each row
  for (let i = 0; i < count; i++) {
    const ry = rowTop + i * (rowH + rowGap);
    const arrowCx = leftX + colW;
    const arrowCy = ry + rowH / 2;
    // Glow shadow line behind
    svgBlock += `<line x1="${arrowCx + 6}" y1="${arrowCy}" x2="${arrowCx + arrowZone - 10}" y2="${arrowCy}" stroke="${hexToRgba(mitigColor, 0.2)}" stroke-width="8" filter="url(#rmglo)"/>`;
    // Main gradient arrow line — thicker
    svgBlock += `<line x1="${arrowCx + 6}" y1="${arrowCy}" x2="${arrowCx + arrowZone - 14}" y2="${arrowCy}" stroke="url(#rmArrowGrad)" stroke-width="3"/>`;
    svgBlock += `<polygon points="${arrowCx + arrowZone - 14},${arrowCy - 6} ${arrowCx + arrowZone - 4},${arrowCy} ${arrowCx + arrowZone - 14},${arrowCy + 6}" fill="${mitigColor}"/>`;
  }
  svgBlock += `</svg>`;

  let html = svgBlock;

  // Column headers — badge-style chips with SVG icon + bold text
  // Risk header
  html += `<div style="position:absolute;left:${leftX}px;top:${headerY}px;display:inline-flex;align-items:center;padding:5px 16px;background:${hexToRgba(riskColor, dark ? 0.15 : 0.08)};border-radius:12px;border:1px solid ${hexToRgba(riskColor, 0.25)};${dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)' : ''}">`;
  html += `<svg width="14" height="14" viewBox="0 0 24 24" style="margin-right:6px"><path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z" fill="${riskColor}"/><rect x="11" y="10" width="2" height="5" fill="${riskColor}"/><rect x="11" y="16" width="2" height="2" fill="${riskColor}"/></svg>`;
  html += `<span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${riskColor}">Risk</span>`;
  html += `</div>`;
  // Mitigation header
  html += `<div style="position:absolute;left:${rightX}px;top:${headerY}px;display:inline-flex;align-items:center;padding:5px 16px;background:${hexToRgba(mitigColor, dark ? 0.15 : 0.08)};border-radius:12px;border:1px solid ${hexToRgba(mitigColor, 0.25)};${dark ? 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)' : ''}">`;
  html += `<svg width="14" height="14" viewBox="0 0 24 24" style="margin-right:6px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" fill="${mitigColor}"/></svg>`;
  html += `<span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${mitigColor}">Mitigation</span>`;
  html += `</div>`;

  for (let i = 0; i < count; i++) {
    const pair = pairs[i];
    const ry = rowTop + i * (rowH + rowGap);
    const glassProps = dark
      ? `backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12)`
      : `border:1px solid ${hexToRgba(p.border, 0.15)}`;

    // Risk card — glass with red wash gradient
    html += `<div style="position:absolute;left:${leftX}px;top:${ry}px;width:${colW}px;height:${rowH}px;background:${dark ? hexToRgba(p.surface, 0.18) : p.surface};border-left:5px solid ${riskColor};border-radius:12px;box-shadow:${cardShadow(2, dark)};${glassProps}">`;
    html += `<div style="position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(90deg,${hexToRgba(riskColor, 0.1)},transparent);border-radius:12px;pointer-events:none"></div>`;
    html += `</div>`;
    html += `<div style="position:absolute;left:${leftX + 20}px;top:${ry + Math.round((rowH - 22) / 2)}px;width:${colW - 40}px;display:flex;align-items:center;font-size:14px;line-height:1.4;color:${p.text};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">`;
    html += `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${hexToRgba(riskColor, 0.15)};margin-right:8px;flex-shrink:0;font-size:12px;color:${riskColor}">\u26A0</span>`;
    html += `${escHtml(pair.risk)}</div>`;

    // Mitigation card — glass with green wash gradient
    html += `<div style="position:absolute;left:${rightX}px;top:${ry}px;width:${colW}px;height:${rowH}px;background:${dark ? hexToRgba(p.surface, 0.18) : p.surface};border-left:5px solid ${mitigColor};border-radius:12px;box-shadow:${cardShadow(2, dark)};${glassProps}">`;
    html += `<div style="position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(90deg,${hexToRgba(mitigColor, 0.1)},transparent);border-radius:12px;pointer-events:none"></div>`;
    html += `</div>`;
    html += `<div style="position:absolute;left:${rightX + 20}px;top:${ry + Math.round((rowH - 22) / 2)}px;width:${colW - 40}px;display:flex;align-items:center;font-size:14px;line-height:1.4;color:${p.text};overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">`;
    html += `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${hexToRgba(mitigColor, 0.15)};margin-right:8px;flex-shrink:0;font-size:12px;color:${mitigColor}">\u2713</span>`;
    html += `${escHtml(pair.mitigation)}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.primary, 0.07, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  ${html}
</div>`;
}


// ── DEMO_SCREENSHOT ──────────────────────────────────────────
// Browser bezel frame with image + numbered callout pins with connecting lines — BOLD edition

function buildDemoScreenshot(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);

  const features: { num: number; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s*(.+)/);
    if (m) features.push({ num: parseInt(m[1], 10), text: m[2].trim() });
  }
  if (features.length === 0) {
    features.push({ num: 1, text: 'Main dashboard view' });
    features.push({ num: 2, text: 'Real-time analytics' });
    features.push({ num: 3, text: 'Quick actions panel' });
    features.push({ num: 4, text: 'Settings and config' });
  }

  const count = Math.min(features.length, 6);
  const imgTop = PAD + 95;
  const imgH = H - imgTop - PAD - 10;
  const imgW = Math.round((cW - PAD * 2) * 0.6);
  const imgLeft = PAD;
  const bezelH = 34;
  const bezelColor = dark ? hexToRgba(p.surface, 0.5) : hexToRgba(p.border, 0.15);

  // ── SVG defs ──
  let svgDefs = `<defs>`;
  svgDefs += `<filter id="dsglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<pattern id="dsDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgDefs += `<linearGradient id="dsConnGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${p.accent}"/><stop offset="100%" stop-color="${hexToRgba(p.accent, 0.3)}"/></linearGradient>`;
  svgDefs += `</defs>`;

  let html = '';

  // Dot mesh background over feature text area
  const labelLeft = imgLeft + imgW + 24;
  html += `<svg style="position:absolute;left:${labelLeft - 10}px;top:${imgTop}px;width:${cW - labelLeft + 10 - PAD}px;height:${imgH}px;pointer-events:none"><rect width="100%" height="100%" fill="url(#dsDots)"/></svg>`;

  // Browser bezel frame — gradient toolbar
  html += `<div style="position:absolute;left:${imgLeft}px;top:${imgTop}px;width:${imgW}px;height:${bezelH}px;background:linear-gradient(180deg,${dark ? hexToRgba(p.surface, 0.5) : hexToRgba(p.border, 0.15)},${dark ? hexToRgba(p.surface, 0.3) : hexToRgba(p.border, 0.08)});border-radius:14px 14px 0 0;display:flex;align-items:center;padding:0 14px;border:1px solid ${hexToRgba(p.border, 0.1)};border-bottom:none">`;
  // Traffic light dots — larger with glow
  html += `<div style="width:12px;height:12px;border-radius:50%;background:${p.error || '#ef4444'};margin-right:7px;box-shadow:0 0 6px ${hexToRgba(p.error || '#ef4444', 0.5)}"></div>`;
  html += `<div style="width:12px;height:12px;border-radius:50%;background:${p.warning || '#eab308'};margin-right:7px;box-shadow:0 0 6px ${hexToRgba(p.warning || '#eab308', 0.5)}"></div>`;
  html += `<div style="width:12px;height:12px;border-radius:50%;background:${p.success || '#22c55e'};box-shadow:0 0 6px ${hexToRgba(p.success || '#22c55e', 0.5)}"></div>`;
  html += `<div style="flex:1;height:18px;background:${hexToRgba(p.border, 0.1)};border-radius:9px;margin-left:16px"></div>`;
  html += `</div>`;

  // Image content area — cardShadow(3)
  const contentTop = imgTop + bezelH;
  const contentH = imgH - bezelH;
  if (slide.imageUrl) {
    html += `<div style="position:absolute;left:${imgLeft}px;top:${contentTop}px;width:${imgW}px;height:${contentH}px;border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${hexToRgba(p.border, 0.15)};border-top:none;box-shadow:${cardShadow(3, dark)}"><img src="${escHtml(slide.imageUrl)}" style="width:100%;height:100%;object-fit:cover"/></div>`;
  } else {
    // Placeholder mockup — grid pattern with accent-tinted rectangles
    html += `<div style="position:absolute;left:${imgLeft}px;top:${contentTop}px;width:${imgW}px;height:${contentH}px;background:${dark ? hexToRgba(p.surface, 0.12) : hexToRgba(p.border, 0.04)};border-radius:0 0 14px 14px;border:1px solid ${hexToRgba(p.border, 0.15)};border-top:none;box-shadow:${cardShadow(3, dark)};overflow:hidden">`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;height:100%;box-sizing:border-box">`;
    for (let g = 0; g < 6; g++) {
      const tint = hexToRgba(p.accent, 0.04 + (g % 3) * 0.02);
      html += `<div style="background:${tint};border:1px solid ${hexToRgba(p.accent, 0.08)};border-radius:8px"></div>`;
    }
    html += `</div></div>`;
  }

  // Feature callouts — connector lines SVG
  const labelW = cW - labelLeft - PAD;
  const labelGap = Math.min(80, Math.round(contentH / Math.max(count, 1)));
  const circleD = 40;

  let svgLines = svgDefs;
  for (let i = 0; i < count; i++) {
    const feat = features[i];
    const fy = contentTop + 16 + i * labelGap;
    const lineY = fy + circleD / 2;

    // Gradient connector lines — 2px
    svgLines += `<line x1="${imgLeft + imgW + 2}" y1="${lineY}" x2="${labelLeft - 4}" y2="${lineY}" stroke="url(#dsConnGrad)" stroke-width="2"/>`;

    // Callout pin — larger circle, gradient fill, glow shadow
    html += `<div style="position:absolute;left:${labelLeft}px;top:${fy}px;width:${circleD}px;height:${circleD}px;border-radius:50%;background:linear-gradient(135deg,${p.accent},${hexToRgba(p.accent, 0.7)});box-shadow:0 4px 16px ${hexToRgba(p.accent, 0.4)};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff">${feat.num}</div>`;

    // Feature text — glass card containers with border-left accent
    const glassProps = dark
      ? `background:${hexToRgba(p.surface, 0.15)};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1)`
      : `background:${hexToRgba(p.surface, 0.8)};border:1px solid ${hexToRgba(p.border, 0.12)}`;
    html += `<div style="position:absolute;left:${labelLeft + circleD + 12}px;top:${fy + 2}px;width:${labelW - circleD - 16}px;min-height:${circleD - 4}px;border-left:3px solid ${p.accent};border-radius:8px;padding:6px 12px;box-shadow:${cardShadow(1, dark)};${glassProps};display:flex;align-items:center">`;
    html += `<div style="font-size:14px;font-weight:600;color:${p.text};line-height:1.4">${escHtml(feat.text)}</div>`;
    html += `</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.07, '50%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  ${html}
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgLines}</svg>
</div>`;
}


// ── MILESTONE_TIMELINE ───────────────────────────────────────
// Vertical timeline with progress indicator, glow dots, and milestone cards — BOLD edition

function buildMilestoneTimeline(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  const milestones: { done: boolean; date: string; desc: string }[] = [];
  for (const line of lines) {
    const doneMatch = line.match(/^(?:\u2713|\u2714|\[x\]|\(x\))\s*(.+)/i);
    const futureMatch = line.match(/^(?:\u25CB|\u25EF|\[\s*\]|\(\s*\))\s*(.+)/i);
    const msContent = doneMatch ? doneMatch[1] : futureMatch ? futureMatch[1] : null;
    const done = !!doneMatch;
    if (msContent) {
      const colonIdx = msContent.indexOf(':');
      if (colonIdx > 0) milestones.push({ done, date: msContent.slice(0, colonIdx).trim(), desc: msContent.slice(colonIdx + 1).trim() });
      else milestones.push({ done, date: '', desc: msContent.trim() });
    } else if (line.trim()) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) milestones.push({ done: false, date: line.slice(0, colonIdx).trim(), desc: line.slice(colonIdx + 1).trim() });
    }
  }
  if (milestones.length === 0) {
    milestones.push({ done: true, date: 'Q1 2024', desc: 'MVP Launch' });
    milestones.push({ done: true, date: 'Q2 2024', desc: 'First 100 users' });
    milestones.push({ done: false, date: 'Q3 2024', desc: 'Series A' });
    milestones.push({ done: false, date: 'Q4 2024', desc: 'International expansion' });
  }

  const count = Math.min(milestones.length, 7);
  const doneCount = milestones.filter(m => m.done).length;
  const lineX = Math.round(cW * 0.22);
  const topY = PAD + 95;
  const itemGap = Math.min(80, Math.round((H - topY - PAD - 10) / Math.max(count, 1)));
  const dotR = 16;
  const endY = topY + (count - 1) * itemGap;

  // ── SVG defs: glow, gradient progress, dot mesh ──
  let svgInner = `<defs>`;
  svgInner += `<filter id="mtglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgInner += `<linearGradient id="mtProgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${p.accent}"/><stop offset="100%" stop-color="${p.secondary || p.accent}"/></linearGradient>`;
  svgInner += `<pattern id="mtDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgInner += `</defs>`;

  // Dot mesh
  svgInner += `<rect x="${PAD}" y="${topY - 10}" width="${cW - PAD * 2}" height="${H - topY - PAD + 20}" fill="url(#mtDots)"/>`;

  // Background line (full) — thicker
  svgInner += `<line x1="${lineX}" y1="${topY}" x2="${lineX}" y2="${endY}" stroke="${hexToRgba(p.border, 0.15)}" stroke-width="5"/>`;
  // Progress glow — blurred line behind progress portion
  if (doneCount > 0) {
    const progressY = topY + (Math.min(doneCount, count) - 1) * itemGap;
    svgInner += `<line x1="${lineX}" y1="${topY}" x2="${lineX}" y2="${progressY}" stroke="${hexToRgba(p.accent, 0.3)}" stroke-width="12" filter="url(#mtglo)"/>`;
    // Main progress line — gradient
    svgInner += `<line x1="${lineX}" y1="${topY}" x2="${lineX}" y2="${progressY}" stroke="url(#mtProgGrad)" stroke-width="5"/>`;
  }

  let html = '';
  // Progress label — accent pill
  html += `<div style="position:absolute;left:${PAD}px;top:${PAD + 66}px;display:inline-flex;align-items:center;padding:4px 14px;background:${hexToRgba(p.accent, dark ? 0.15 : 0.08)};border-radius:12px;border:1px solid ${hexToRgba(p.accent, 0.2)}"><span style="font-size:12px;font-weight:800;color:${p.accent}">${doneCount}/${count} completed</span></div>`;

  for (let i = 0; i < count; i++) {
    const ms = milestones[i];
    const my = topY + i * itemGap;
    const color = accents[i % accents.length];

    if (ms.done) {
      // Done node — larger, gradient fill, glow halo
      svgInner += `<circle cx="${lineX}" cy="${my}" r="${dotR + 4}" fill="${hexToRgba(color, 0.15)}" filter="url(#mtglo)"/>`;
      html += `<div style="position:absolute;left:${lineX - dotR}px;top:${my - dotR}px;width:${dotR * 2}px;height:${dotR * 2}px;border-radius:50%;background:linear-gradient(135deg,${color},${hexToRgba(color, 0.7)});box-shadow:0 0 16px ${hexToRgba(color, 0.5)},0 0 32px ${hexToRgba(color, 0.2)}"></div>`;
      html += `<div style="position:absolute;left:${lineX - dotR}px;top:${my - dotR}px;width:${dotR * 2}px;height:${dotR * 2}px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:800">\u2713</div>`;
    } else {
      // Future node — larger, dashed border, subtle inner dot
      html += `<div style="position:absolute;left:${lineX - dotR}px;top:${my - dotR}px;width:${dotR * 2}px;height:${dotR * 2}px;border-radius:50%;background:${p.background};border:2.5px dashed ${hexToRgba(color, 0.4)}"></div>`;
      html += `<div style="position:absolute;left:${lineX - 4}px;top:${my - 4}px;width:8px;height:8px;border-radius:50%;background:${hexToRgba(color, 0.25)}"></div>`;
    }

    // Milestone card — glass style, cardShadow(2), left border accent 4px
    const cardLeft = lineX + dotR + 24;
    const cardW = cW - cardLeft - PAD;
    const cardH = Math.min(64, itemGap - 10);
    const glassProps = dark
      ? `background:${hexToRgba(p.surface, ms.done ? 0.2 : 0.1)};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1)`
      : `background:${ms.done ? p.surface : hexToRgba(p.surface, 0.6)};border:1px solid ${hexToRgba(p.border, 0.12)}`;
    html += `<div style="position:absolute;left:${cardLeft}px;top:${my - cardH / 2}px;width:${cardW}px;height:${cardH}px;border-radius:12px;border-left:4px solid ${color};box-shadow:${ms.done ? cardShadow(2, dark) : 'none'};padding:8px 14px;opacity:${ms.done ? 1 : 0.7};${glassProps}">`;
    if (ms.date) {
      // Date as badge pill
      html += `<div style="display:inline-flex;align-items:center;padding:2px 10px;background:${hexToRgba(color, dark ? 0.15 : 0.08)};border-radius:8px;margin-bottom:4px"><span style="font-size:14px;font-weight:800;color:${color}">${escHtml(ms.date)}</span></div>`;
      html += `<div style="font-size:13px;color:${p.text};opacity:0.85;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:2px;line-height:1.5">${escHtml(ms.desc)}</div>`;
    } else {
      html += `<div style="font-size:13px;color:${p.text};line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(ms.desc)}</div>`;
    }
    html += `</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.07, '40%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0;width:${cW}px;height:${H}px;pointer-events:none" viewBox="0 0 ${cW} ${H}">${svgInner}</svg>
  ${html}
</div>`;
}


// ── PARTNERSHIP_LOGOS ─────────────────────────────────────────
// Categorized partner grid with logo-style badges and colored category chips — BOLD edition

function buildPartnershipLogos(slide: SlideInput, p: ColorPalette, hasImage = false, accentDiversity = true): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const dark = isDarkBackground(p.background);
  const accents = cardAccentColors(p, accentDiversity ? colorOffset(slide.title) : 0);

  const categories: { label: string; names: string[] }[] = [];
  for (const line of lines) {
    const sep = line.indexOf(':');
    if (sep > 0) {
      const label = line.slice(0, sep).trim();
      const names = line.slice(sep + 1).split(',').map(n => n.trim()).filter(Boolean);
      if (names.length > 0) categories.push({ label, names });
    }
  }
  if (categories.length === 0) {
    categories.push({ label: 'Technology', names: ['AWS', 'Google Cloud', 'Azure'] });
    categories.push({ label: 'Integration', names: ['Salesforce', 'HubSpot', 'Slack'] });
  }

  const catCount = Math.min(categories.length, 4);
  const startY = PAD + 100;
  const availH = H - startY - PAD;
  const catGap = 16;
  const catH = Math.round((availH - (catCount - 1) * catGap) / catCount);
  const contentW = cW - PAD * 2;

  // ── SVG defs ──
  let svgDefs = `<svg style="position:absolute;left:0;top:0;width:0;height:0"><defs>`;
  svgDefs += `<filter id="plglo"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  svgDefs += `<pattern id="plDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${hexToRgba(p.text, 0.06)}"/></pattern>`;
  svgDefs += `</defs></svg>`;

  let html = svgDefs;

  // Dot mesh background
  html += `<svg style="position:absolute;left:${PAD}px;top:${startY - 10}px;width:${contentW}px;height:${availH + 20}px;pointer-events:none"><rect width="100%" height="100%" fill="url(#plDots)"/></svg>`;

  for (let ci = 0; ci < catCount; ci++) {
    const cat = categories[ci];
    const color = accents[ci % accents.length];
    const cy = startY + ci * (catH + catGap);
    const glassProps = dark
      ? `backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1)`
      : `border:1px solid ${hexToRgba(p.border, 0.12)}`;

    // Full-width glass category panel bar
    html += `<div style="position:absolute;left:${PAD}px;top:${cy}px;width:${contentW}px;height:36px;background:${hexToRgba(color, dark ? 0.08 : 0.04)};border-radius:12px;box-shadow:${cardShadow(1, dark)};display:flex;align-items:center;padding:0 16px;${glassProps}">`;
    // Accent dot
    html += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:10px;box-shadow:0 0 6px ${hexToRgba(color, 0.4)}"></span>`;
    // Category label — bold uppercase
    html += `<span style="font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${color}">${escHtml(cat.label)}</span>`;
    // Count badge
    html += `<span style="margin-left:10px;display:inline-flex;align-items:center;justify-content:center;width:24px;height:20px;background:${hexToRgba(color, 0.15)};border-radius:10px;font-size:11px;font-weight:800;color:${color}">${cat.names.length}</span>`;
    html += `</div>`;

    // Partner badges grid
    const badgeTop = cy + 44;
    const maxPerRow = 4;
    const badgeGap = 10;
    const nameCount = Math.min(cat.names.length, 8);
    const badgeW = Math.min(160, Math.round((contentW - (maxPerRow - 1) * badgeGap) / maxPerRow));
    const badgeH = 44;

    for (let ni = 0; ni < nameCount; ni++) {
      const col_idx = ni % maxPerRow;
      const row = Math.floor(ni / maxPerRow);
      const bx = PAD + col_idx * (badgeW + badgeGap);
      const by = badgeTop + row * (badgeH + 10);
      const badgeGlass = dark
        ? `background:${hexToRgba(p.surface, 0.18)};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12)`
        : `background:${p.surface};border:1px solid ${hexToRgba(p.border, 0.15)}`;

      html += `<div style="position:absolute;left:${bx}px;top:${by}px;width:${badgeW}px;height:${badgeH}px;${badgeGlass};border-radius:12px;box-shadow:${cardShadow(2, dark)};display:flex;align-items:center;padding:0 12px">`;
      // Logo initial circle — gradient fill, bold white letter
      html += `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${color},${hexToRgba(color, 0.6)});display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 2px 8px ${hexToRgba(color, 0.3)}">${escHtml(cat.names[ni].charAt(0))}</div>`;
      html += `<span style="margin-left:10px;font-size:13px;font-weight:600;color:${p.text};overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escHtml(cat.names[ni])}</span>`;
      html += `</div>`;
    }

    // Decorative horizontal SVG line between categories
    if (ci < catCount - 1) {
      const lineY = cy + catH + catGap / 2;
      html += `<svg style="position:absolute;left:${PAD + 20}px;top:${lineY}px;width:${contentW - 40}px;height:2px;pointer-events:none"><line x1="0" y1="1" x2="${contentW - 40}" y2="1" stroke="${hexToRgba(p.border, 0.1)}" stroke-width="1" stroke-dasharray="6,4"/></svg>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};overflow:hidden">
  ${bgGradientOverlay(cW, H, p.accent, 0.07, '45%')}
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;font-size:${titleFontSize(slide.title)}px;font-weight:800;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2;letter-spacing:0.5px;${dark ? `text-shadow:${textGlow(p.accent, 0.4)}` : ''}">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD}px;top:${PAD + 56}px;width:60px;height:4px;background:linear-gradient(90deg,${p.accent},${hexToRgba(p.accent, 0.3)});border-radius:2px"></div>
  ${html}
</div>`;
}
