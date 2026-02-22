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
}

// ── Constants ────────────────────────────────────────────────

const PAD = 53;       // 40 * (1280/960)
const W = 1280;
const H = 720;

// Slide types that use Figma-grade HTML+SVG templates for superior visuals.
export const FIGMA_GRADE_TYPES: Set<string> = new Set([
  'COMPARISON', 'TIMELINE', 'METRICS_HIGHLIGHT', 'MARKET_SIZING', 'TEAM', 'FEATURE_GRID',
  'PROCESS', 'PROBLEM', 'SOLUTION', 'CTA',
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
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1');
}

function parseBodyLines(body: string): string[] {
  return body
    .split('\n')
    .map((l) => stripMarkdown(l.replace(/^[-•*]\s*/, '').replace(/<[^>]*>/g, '').trim()))
    .filter(Boolean);
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Scoped reset injected into every Figma-grade slide ──────

const SCOPED_RESET = `<style scoped>
section { padding: 0 !important; display: block !important; overflow: hidden !important; }
section > * { flex-shrink: unset; }
</style>`;

// ── Public API ───────────────────────────────────────────────

export function buildHtmlSlideContent(
  slide: SlideInput,
  palette: ColorPalette,
): string {
  // Strip markdown bold/italic from title and body at entry point
  const cleaned: SlideInput = {
    ...slide,
    title: stripMarkdown(slide.title),
    body: stripMarkdown(slide.body),
  };
  switch (cleaned.slideType) {
    case 'MARKET_SIZING':
      return buildMarketSizing(cleaned, palette);
    case 'TIMELINE':
      return buildTimeline(cleaned, palette);
    case 'METRICS_HIGHLIGHT':
      return buildMetricsHighlight(cleaned, palette);
    case 'COMPARISON':
      return buildComparison(cleaned, palette);
    case 'TEAM':
      return buildTeam(cleaned, palette);
    case 'FEATURE_GRID':
      return buildFeatureGrid(cleaned, palette);
    case 'PROCESS':
      return buildProcess(cleaned, palette);
    case 'PROBLEM':
      return buildProblem(cleaned, palette);
    case 'SOLUTION':
      return buildSolution(cleaned, palette);
    case 'CTA':
      return buildCta(cleaned, palette);
    default:
      return '';
  }
}

// ── MARKET_SIZING ────────────────────────────────────────────
// Concentric TAM/SAM/SOM circles (right) + text column (left)

function buildMarketSizing(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const cx = Math.round(W * 0.72);  // 922
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
    bodyHtml += `<div style="position:absolute;left:${PAD}px;top:${ty}px;width:${Math.round(W * 0.4)}px;font-size:13px;line-height:1.5;opacity:0.85;color:${p.text}">${escHtml(line)}</div>`;
    ty += 38;
  }

  const circlesSvg = circles.map((c) =>
    `<circle cx="${cx}" cy="${cy}" r="${c.r}" fill="${p.primary}" opacity="${c.opacity}" />`
  ).join('');

  const labelsSvg = labelOffsets.map((l) =>
    `<text x="${cx}" y="${cy + l.dy}" text-anchor="middle" fill="${p.primary}" font-size="14" font-weight="bold" letter-spacing="2">${l.label}</text>`
  ).join('');

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${Math.round(W * 0.45)}px;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
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

function buildTimeline(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const milestones = lines.map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1) return { date: line.slice(0, sep).trim(), text: line.slice(sep + 1).trim() };
    return { date: '', text: line };
  });

  if (milestones.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const lineY = Math.round(H * 0.55);  // 396
  const lineStartX = PAD + 53;         // ~106
  const lineEndX = W - PAD - 53;       // ~1174
  const count = milestones.length;
  const spacing = (lineEndX - lineStartX) / (count - 1 || 1);
  const nodeR = 8;

  let nodesSvg = '';
  let labelHtml = '';

  for (let i = 0; i < count; i++) {
    const cx = count === 1 ? W / 2 : lineStartX + i * spacing;
    const isLast = i === count - 1;
    const fill = isLast ? p.accent : p.primary;

    nodesSvg += `<circle cx="${Math.round(cx)}" cy="${lineY}" r="${nodeR}" fill="${fill}" />`;

    if (milestones[i].date) {
      labelHtml += `<div style="position:absolute;left:${Math.round(cx - 80)}px;top:${lineY - 50}px;width:160px;text-align:center;font-size:12px;font-weight:bold;color:${p.primary};letter-spacing:1px">${escHtml(milestones[i].date)}</div>`;
    }
    labelHtml += `<div style="position:absolute;left:${Math.round(cx - 90)}px;top:${lineY + 24}px;width:180px;text-align:center;font-size:11px;line-height:1.4;color:${p.text};opacity:0.8">${escHtml(milestones[i].text)}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((W - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${lineStartX}" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" stroke="${p.border}" stroke-width="2" />
    ${nodesSvg}
  </svg>
  ${labelHtml}
</div>`;
}

// ── METRICS_HIGHLIGHT ────────────────────────────────────────
// Big hero number + radial glow + secondary metrics row

function buildMetricsHighlight(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);

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
  }

  const heroY = Math.round(H * 0.22);
  const supportText = supportLines.join(' ');

  // Secondary metrics: look for lines with "value: label" or "value - label" pattern
  let secondaryHtml = '';
  const metricLines = supportLines.filter((l) => /^[\d$€£¥]/.test(l.trim()) || /%/.test(l));
  const nonMetricLines = supportLines.filter((l) => !metricLines.includes(l));

  if (metricLines.length >= 2) {
    const secY = Math.round(H * 0.72);
    const cols = Math.min(metricLines.length, 3);
    const colW = Math.round((W - PAD * 2 - 200) / cols);
    for (let i = 0; i < cols; i++) {
      const cx = PAD + 100 + i * colW;
      const parts = metricLines[i].split(/[:\-–—]/);
      const val = parts[0].trim();
      const label = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
      secondaryHtml += `<div style="position:absolute;left:${cx}px;top:${secY}px;width:${colW}px;text-align:center">
        <div style="font-size:24px;font-weight:bold;color:${p.primary}">${escHtml(val)}</div>
        ${label ? `<div style="font-size:10px;color:${p.text};opacity:0.6;margin-top:4px">${escHtml(label)}</div>` : ''}
      </div>`;
    }
  }

  const displaySupport = nonMetricLines.length > 0 ? nonMetricLines.join(' ') : (metricLines.length < 2 ? supportText : '');

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:radial-gradient(ellipse 800px 600px at 50% 40%,${hexToRgba(p.primary, 0.08)} 0%,transparent 70%)"></div>
  <div style="position:absolute;left:${PAD}px;top:${heroY}px;width:${W - PAD * 2}px;text-align:center;font-size:80px;font-weight:bold;color:${p.primary};line-height:1">${escHtml(bigValue)}</div>
  ${bigLabel || bigValue !== slide.title ? `<div style="position:absolute;left:${PAD + 100}px;top:${heroY + 100}px;width:${W - PAD * 2 - 200}px;text-align:center;font-size:21px;font-weight:bold;color:${p.text};line-height:1.3">${escHtml(bigLabel || slide.title)}</div>` : ''}
  <div style="position:absolute;left:${Math.round((W - 80) / 2)}px;top:${heroY + 140}px;width:80px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${displaySupport ? `<div style="position:absolute;left:${PAD + 160}px;top:${heroY + 164}px;width:${W - PAD * 2 - 320}px;text-align:center;font-size:15px;line-height:1.5;color:${p.text};opacity:0.7">${escHtml(displaySupport)}</div>` : ''}
  ${secondaryHtml}
</div>`;
}

// ── COMPARISON ───────────────────────────────────────────────
// Two cards + floating VS circle badge

function buildComparison(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
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
    const mid = Math.ceil(lines.length / 2);
    leftLines = lines.slice(0, mid);
    rightLines = lines.slice(mid);
  }

  // Extract headers
  if (leftLines.length > 0 && !/^[-•]/.test(leftLines[0])) leftTitle = leftLines.shift()!;
  if (rightLines.length > 0 && !/^[-•]/.test(rightLines[0])) rightTitle = rightLines.shift()!;

  const colW = Math.round((W - PAD * 2 - 40) / 2);  // ~574
  const cardY = PAD + 80;                             // 133
  const cardH = H - cardY - PAD;                      // 534
  const rightX = PAD + colW + 40;

  const maxItems = Math.floor((cardH - 80) / 40);
  function renderItems(items: string[], x: number, bullet: string): string {
    let html = '';
    let y = cardY + 68;
    const limited = items.slice(0, maxItems);
    for (const item of limited) {
      html += `<div style="position:absolute;left:${x + 24}px;top:${y}px;width:${colW - 48}px;font-size:13px;line-height:1.5;color:${p.text};opacity:0.85;overflow:hidden;text-overflow:ellipsis;word-wrap:break-word;max-height:36px">${bullet} ${escHtml(stripMarkdown(item))}</div>`;
      y += 40;
    }
    return html;
  }

  const vsCy = cardY + cardH / 2;

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((W - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.primary, 0.1)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${PAD + 24}px;top:${cardY + 14}px;font-size:16px;font-weight:bold;color:${p.primary}">${escHtml(stripMarkdown(leftTitle))}</div>
  ${renderItems(leftLines, PAD, '\u2022')}
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:2px solid ${p.primary};border-radius:16px"></div>
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.primary, 0.15)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${rightX + 24}px;top:${cardY + 14}px;font-size:16px;font-weight:bold;color:${p.primary}">${escHtml(stripMarkdown(rightTitle))}</div>
  ${renderItems(rightLines, rightX, '\u2713')}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${W / 2}" cy="${Math.round(vsCy)}" r="24" fill="${p.background}" stroke="${p.border}" stroke-width="1" />
    <text x="${W / 2}" y="${Math.round(vsCy + 5)}" text-anchor="middle" fill="${p.text}" font-size="12" font-weight="bold" opacity="0.5">VS</text>
  </svg>
</div>`;
}

// ── TEAM ─────────────────────────────────────────────────────
// Grid of cards with avatar circles + computed initials

function buildTeam(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const members = lines.map((line) => {
    const sep = line.indexOf(' - ');
    if (sep > -1) return { name: line.slice(0, sep).trim(), role: line.slice(sep + 3).trim() };
    return { name: line, role: '' };
  });

  if (members.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text}">${escHtml(slide.title)}</div>
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
  const startX = Math.round((W - totalW) / 2);
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
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px"></div>`;

    // Name + role
    cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + 100}px;width:${cardW - 24}px;text-align:center;font-size:14px;font-weight:bold;color:${p.text}">${escHtml(members[i].name)}</div>`;
    if (members[i].role) {
      cardsHtml += `<div style="position:absolute;left:${cx + 12}px;top:${cy + 124}px;width:${cardW - 24}px;text-align:center;font-size:11px;color:${p.text};opacity:0.6">${escHtml(members[i].role)}</div>`;
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
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((W - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${avatarsSvg}
  </svg>
</div>`;
}

// ── FEATURE_GRID ─────────────────────────────────────────────
// Auto-column grid with icon placeholder squares

function buildFeatureGrid(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const features = lines.map((line) => {
    const sep = line.indexOf(':');
    if (sep > -1) return { title: stripMarkdown(line.slice(0, sep).trim()), desc: stripMarkdown(line.slice(sep + 1).trim()) };
    return { title: stripMarkdown(line), desc: '' };
  });

  if (features.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = features.length;
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gapX = 24;
  const gapY = 24;
  const cardW = Math.round((W - PAD * 2 - (cols - 1) * gapX) / cols);
  const cardH = 160;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startY = Math.round(PAD + 80 + (H - PAD * 2 - 80 - totalH) / 2);

  let html = '';
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;border-top:3px solid ${p.accent}"></div>`;
    // Icon placeholder
    html += `<div style="position:absolute;left:${cx + 24}px;top:${cy + 24}px;width:36px;height:36px;background:${p.primary};border-radius:8px;opacity:0.8"></div>`;
    // Title
    html += `<div style="position:absolute;left:${cx + 24}px;top:${cy + 72}px;width:${cardW - 48}px;font-size:14px;font-weight:bold;color:${p.text}">${escHtml(features[i].title)}</div>`;
    // Description
    if (features[i].desc) {
      html += `<div style="position:absolute;left:${cx + 24}px;top:${cy + 96}px;width:${cardW - 48}px;font-size:11px;line-height:1.5;color:${p.text};opacity:0.7">${escHtml(features[i].desc)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((W - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${html}
</div>`;
}

// ── PROCESS ─────────────────────────────────────────────────
// Numbered step cards with connectors

function buildProcess(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const steps = lines.map((line, i) => {
    const sep = line.indexOf(':');
    const numMatch = line.match(/^\d+\.\s*/);
    const cleaned = numMatch ? line.slice(numMatch[0].length) : line;
    const sepIdx = cleaned.indexOf(':');
    if (sepIdx > -1) return { num: i + 1, title: stripMarkdown(cleaned.slice(0, sepIdx).trim()), desc: stripMarkdown(cleaned.slice(sepIdx + 1).trim()) };
    return { num: i + 1, title: stripMarkdown(cleaned), desc: '' };
  });

  if (steps.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = Math.min(steps.length, 5);
  const cardW = 200;
  const cardH = 260;
  const gapX = 24;
  const totalW = count * cardW + (count - 1) * gapX;
  const startX = Math.round((W - totalW) / 2);
  const cardY = Math.round(PAD + 100);

  let cardsHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const cx = startX + i * (cardW + gapX);
    // Card background
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cardY}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;border-top:3px solid ${p.accent}"></div>`;
    // Step number circle
    cardsHtml += `<div style="position:absolute;left:${cx + cardW / 2 - 20}px;top:${cardY + 20}px;width:40px;height:40px;border-radius:50%;background:${p.accent};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#FFFFFF;text-align:center;line-height:40px">${String(steps[i].num).padStart(2, '0')}</div>`;
    // Title
    cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cardY + 76}px;width:${cardW - 32}px;text-align:center;font-size:14px;font-weight:bold;color:${p.text}">${escHtml(steps[i].title)}</div>`;
    // Description
    if (steps[i].desc) {
      cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cardY + 104}px;width:${cardW - 32}px;text-align:center;font-size:11px;line-height:1.5;color:${p.text};opacity:0.7">${escHtml(steps[i].desc)}</div>`;
    }
    // Connector arrow between cards
    if (i < count - 1) {
      const arrowX1 = cx + cardW + 2;
      const arrowX2 = cx + cardW + gapX - 2;
      const arrowY = cardY + cardH / 2;
      connectorsSvg += `<line x1="${arrowX1}" y1="${arrowY}" x2="${arrowX2}" y2="${arrowY}" stroke="${p.border}" stroke-width="2" marker-end="url(#arrowhead)" />`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${W - PAD * 2}px;text-align:center;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((W - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${cardsHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" /></marker></defs>
    ${connectorsSvg}
  </svg>
</div>`;
}

// ── PROBLEM ─────────────────────────────────────────────────
// Left accent bar + warning-style icon

function buildProblem(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const barColor = p.error || p.accent;

  let bodyHtml = '';
  let ty = PAD + 100;
  for (const line of lines.slice(0, 6)) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${W - PAD * 2 - 40}px;font-size:14px;line-height:1.6;color:${p.text};opacity:0.85;padding-left:12px;border-left:2px solid ${hexToRgba(barColor, 0.3)}">${escHtml(stripMarkdown(line))}</div>`;
    ty += 48;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <polygon points="16,2 30,28 2,28" fill="none" stroke="${barColor}" stroke-width="2"/>
    <text x="16" y="24" text-anchor="middle" fill="${barColor}" font-size="16" font-weight="bold">!</text>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── SOLUTION ────────────────────────────────────────────────
// Left accent bar + checkmark icon

function buildSolution(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const barColor = p.success || p.accent;

  let bodyHtml = '';
  let ty = PAD + 100;
  for (const line of lines.slice(0, 6)) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${W - PAD * 2 - 40}px;font-size:14px;line-height:1.6;color:${p.text};opacity:0.85;padding-left:12px;border-left:2px solid ${hexToRgba(barColor, 0.3)}">${escHtml(stripMarkdown(line))}</div>`;
    ty += 48;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:0;top:0;width:6px;height:${H}px;background:${barColor}"></div>
  <svg style="position:absolute;left:${PAD + 4}px;top:${PAD}px" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="none" stroke="${barColor}" stroke-width="2"/>
    <polyline points="10,16 14,22 24,10" fill="none" stroke="${barColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 4}px;font-size:27px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${PAD + 44}px;top:${PAD + 48}px;width:60px;height:3px;background:${barColor};border-radius:2px"></div>
  ${bodyHtml}
</div>`;
}

// ── CTA ─────────────────────────────────────────────────────
// Centered action card

function buildCta(slide: SlideInput, p: ColorPalette): string {
  const lines = parseBodyLines(slide.body);
  const cardW = 700;
  const cardH = 320;
  const cardX = Math.round((W - cardW) / 2);
  const cardY = Math.round((H - cardH) / 2) + 20;

  let actionsHtml = '';
  let ay = cardY + 100;
  for (const line of lines.slice(0, 3)) {
    actionsHtml += `<div style="position:absolute;left:${cardX + 40}px;top:${ay}px;width:${cardW - 80}px;font-size:16px;line-height:1.5;color:${p.text}"><span style="color:${p.accent};font-weight:bold;margin-right:8px">&rarr;</span>${escHtml(stripMarkdown(line))}</div>`;
    ay += 44;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;">
  <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:radial-gradient(ellipse 800px 600px at 50% 50%,${hexToRgba(p.accent, 0.06)} 0%,transparent 70%)"></div>
  <div style="position:absolute;left:${cardX}px;top:${cardY}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:2px solid ${p.accent};border-radius:20px;box-shadow:0 8px 40px ${hexToRgba(p.accent, 0.1)}"></div>
  <div style="position:absolute;left:${cardX}px;top:${cardY + 28}px;width:${cardW}px;text-align:center;font-size:28px;font-weight:bold;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round(W / 2 - 30)}px;top:${cardY + 72}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${actionsHtml}
</div>`;
}
