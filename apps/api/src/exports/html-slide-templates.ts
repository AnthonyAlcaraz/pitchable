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
      // Strip HTML tags, bullet markers, markdown formatting
      cleaned = cleaned.replace(/^[-•*]\s*/, '').replace(/<[^>]*>/g, '').trim();
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
  const expanded = splitProseToItems(rawLines, 3);
  const milestones = expanded.map((line, i) => {
    const sep = line.indexOf(':');
    if (sep > -1) return { date: line.slice(0, sep).trim(), text: line.slice(sep + 1).trim() };
    // If no date found and we expanded prose, use index-based labels
    if (rawLines.length < 3) return { date: 'Phase ' + (i + 1), text: line };
    return { date: '', text: line };
  });

  if (milestones.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const visibleW = hasImage ? Math.round(W * 0.7) : W;  // 896 when image present
  const lineY = Math.round(H * 0.55);  // 396
  const lineStartX = PAD + 53;         // ~106
  const lineEndX = visibleW - PAD - 53;  // 790 when image vs 1174
  const count = milestones.length;
  const spacing = (lineEndX - lineStartX) / (count - 1 || 1);
  const nodeR = 8;

  let nodesSvg = '';
  let labelHtml = '';

  for (let i = 0; i < count; i++) {
    const cx = count === 1 ? cW / 2 : lineStartX + i * spacing;
    const isLast = i === count - 1;
    const fill = isLast ? p.accent : p.primary;

    nodesSvg += `<circle cx="${Math.round(cx)}" cy="${lineY}" r="${nodeR}" fill="${fill}" />`;

    const dateW = hasImage ? 120 : 160;
    const textW = hasImage ? 140 : 180;
    if (milestones[i].date) {
      labelHtml += `<div style="position:absolute;left:${Math.round(cx - dateW / 2)}px;top:${lineY - 50}px;width:${dateW}px;text-align:center;font-size:${hasImage ? 12 : 14}px;font-weight:bold;color:${p.primary};letter-spacing:1px">${escHtml(milestones[i].date)}</div>`;
    }
    labelHtml += `<div style="position:absolute;left:${Math.round(cx - textW / 2)}px;top:${lineY + 24}px;width:${textW}px;text-align:center;font-size:${hasImage ? 12 : 14}px;line-height:1.4;color:${p.text};opacity:0.8">${escHtml(milestones[i].text)}</div>`;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
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
  <div style="position:absolute;left:${PAD}px;top:${heroY}px;width:${cW - PAD * 2}px;text-align:center;font-size:${heroFontSize}px;font-weight:bold;color:${p.primary};line-height:1.1;z-index:2">${escHtml(bigValue)}</div>
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
  if (tableStartIdx === -1) return null;

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
// McKinsey table for pipe-delimited data, two cards + VS badge for column format

function buildComparison(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  // ── McKinsey table path: detect pipe-delimited table in body ──
  const table = parseMarkdownTable(slide.body);
  if (table) {
    return buildComparisonTable(slide, p, table, hasImage);
  }

  // ── Card path: two-column layout with VS badge ──
  const cW = hasImage ? CONTENT_W_IMG : W;
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
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)"></div>
  <div style="position:absolute;left:${PAD}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.primary, 0.1)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${PAD + 24}px;top:${cardY + 14}px;font-size:15px;font-weight:bold;color:${p.primary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(stripMarkdown(leftTitle))}</div>
  ${renderItems(leftLines, PAD, '\u2022')}
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:${cardH}px;background:${p.surface};border:2px solid ${p.primary};border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.10)"></div>
  <div style="position:absolute;left:${rightX}px;top:${cardY}px;width:${colW}px;height:52px;background:${hexToRgba(p.primary, 0.15)};border-radius:16px 16px 0 0"></div>
  <div style="position:absolute;left:${rightX + 24}px;top:${cardY + 14}px;font-size:15px;font-weight:bold;color:${p.primary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(stripMarkdown(rightTitle))}</div>
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
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08)"></div>`;

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

  // Cap at 6 features max
  lines = lines.slice(0, 6);

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
  const titleFontSz = cardH >= 220 ? 16 : 14;
  const descFontSz = cardH >= 220 ? 14 : 13;
  const descMaxH = cardH - 110;

  let html = '';
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);

    html += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-top:4px solid ${p.accent}"></div>`;
    // Icon placeholder
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 20}px;width:32px;height:32px;background:${p.primary};border-radius:8px;opacity:0.8"></div>`;
    // Title (allow 2-line wrap)
    html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 64}px;width:${cardW - 40}px;font-size:${titleFontSz}px;font-weight:bold;color:${p.text};overflow:hidden;max-height:40px;line-height:1.3">${escHtml(features[i].title)}</div>`;
    // Description
    if (features[i].desc) {
      html += `<div style="position:absolute;left:${cx + 20}px;top:${cy + 100}px;width:${cardW - 40}px;font-size:${descFontSz}px;line-height:1.4;color:${p.text};opacity:0.8;overflow:hidden;max-height:${descMaxH}px">${escHtml(features[i].desc)}</div>`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
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
  const lines = splitProseToItems(rawLines, 3);
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
  const steps = rawSteps.filter((s) => s.title.length > 0).map((s, i) => ({ ...s, num: i + 1 }));

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

  let cardsHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const col = useRows ? (i % cols) : i;
    const row = useRows ? Math.floor(i / cols) : 0;
    const cx = startX + col * (cardW + gapX);
    const cy = cardY + row * (cardH + gapY);
    // Card background
    cardsHtml += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cardW}px;height:${cardH}px;background:${p.surface};border:1px solid ${p.border};border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-top:4px solid ${p.accent}"></div>`;
    // Step number circle
    cardsHtml += `<div style="position:absolute;left:${cx + cardW / 2 - 20}px;top:${cy + 16}px;width:40px;height:40px;border-radius:50%;background:${p.accent};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;color:#FFFFFF;text-align:center;line-height:40px">${String(steps[i].num).padStart(2, '0')}</div>`;
    // Title
    cardsHtml += `<div style="position:absolute;left:${cx + 16}px;top:${cy + 66}px;width:${cardW - 32}px;text-align:center;font-size:15px;font-weight:bold;color:${p.text};overflow:hidden;max-height:40px">${escHtml(steps[i].title)}</div>`;
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

function buildProblem(slide: SlideInput, p: ColorPalette, hasImage = false): string {
  const cW = hasImage ? CONTENT_W_IMG : W;
  const lines = parseBodyLines(slide.body);
  const barColor = p.error || p.accent;

  // Detect if first line looks like a table header (short, no numbers/dollar signs)
  const isHeader = lines.length > 2 && !/\d/.test(lines[0]) && !/[$€£¥]/.test(lines[0]) && lines[0].length < 60;
  const headerLine = isHeader ? lines[0] : null;
  const dataLines = isHeader ? lines.slice(1, 7) : lines.slice(0, 6);

  let bodyHtml = '';
  let ty = PAD + 100;

  // Render header label if detected
  if (headerLine) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;font-size:11px;line-height:1.6;color:${p.text};opacity:0.6;padding-left:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:bold">${escHtml(stripMarkdown(headerLine))}</div>`;
    ty += 32;
  }

  for (const line of dataLines) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;font-size:16px;line-height:1.6;color:${p.text};opacity:0.85;padding-left:12px;border-left:2px solid ${hexToRgba(barColor, 0.3)}">${escHtml(stripMarkdown(line))}</div>`;
    ty += 76;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
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

  let bodyHtml = '';
  let ty = PAD + 100;
  for (const line of lines.slice(0, 6)) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cW - PAD * 2 - 80}px;font-size:16px;line-height:1.6;color:${p.text};opacity:0.85;padding-left:12px;border-left:2px solid ${hexToRgba(barColor, 0.3)}">${escHtml(stripMarkdown(line))}</div>`;
    ty += 76;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
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
  const lines = parseBodyLines(slide.body);

  let bodyHtml = '';
  let ty = PAD + 100;
  const cardPad = 16;
  const cardW = cW - PAD * 2 - 40;

  for (const line of lines.slice(0, 8)) {
    bodyHtml += `<div style="position:absolute;left:${PAD + 32}px;top:${ty}px;width:${cardW}px;height:66px;background:${hexToRgba(p.surface, 0.5)};border:1px solid ${hexToRgba(p.border, 0.3)};border-radius:10px;border-left:4px solid ${hexToRgba(p.accent, 0.6)}"></div>`;
    bodyHtml += `<div style="position:absolute;left:${PAD + 32 + cardPad}px;top:${ty + 22}px;width:${cardW - cardPad * 2}px;font-size:21px;line-height:1.45;color:${p.text};opacity:0.85">${escHtml(stripMarkdown(line))}</div>`;
    ty += 78;
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
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
  const nodes = lines.slice(0, 6);

  if (nodes.length === 0) {
    return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text}">${escHtml(slide.title)}</div>
</div>`;
  }

  const count = nodes.length;
  const boxW = 180;
  const boxH = 80;
  const gapX = 32;
  const totalW = count * boxW + (count - 1) * gapX;
  const startX = Math.round((cW - totalW) / 2);
  const boxY = Math.round(H * 0.4);

  let boxesHtml = '';
  let connectorsSvg = '';

  for (let i = 0; i < count; i++) {
    const cx = startX + i * (boxW + gapX);
    // Parse "title: description" format
    const sep = nodes[i].indexOf(':');
    const title = sep > -1 ? stripMarkdown(nodes[i].slice(0, sep).trim()) : stripMarkdown(nodes[i]);
    const desc = sep > -1 ? stripMarkdown(nodes[i].slice(sep + 1).trim()) : '';

    boxesHtml += `<div style="position:absolute;left:${cx}px;top:${boxY}px;width:${boxW}px;height:${boxH}px;background:${p.surface};border:1px solid ${p.border};border-radius:12px;border-top:4px solid ${p.accent}"></div>`;
    boxesHtml += `<div style="position:absolute;left:${cx + 12}px;top:${boxY + (desc ? 12 : 24)}px;width:${boxW - 24}px;text-align:center;font-size:15px;font-weight:bold;color:${p.text}">${escHtml(title)}</div>`;
    if (desc) {
      boxesHtml += `<div style="position:absolute;left:${cx + 12}px;top:${boxY + 36}px;width:${boxW - 24}px;text-align:center;font-size:13px;color:${p.text};opacity:0.7;line-height:1.4">${escHtml(desc)}</div>`;
    }

    // Connector arrow
    if (i < count - 1) {
      const x1 = cx + boxW + 2;
      const x2 = cx + boxW + gapX - 2;
      const ay = boxY + boxH / 2;
      connectorsSvg += `<line x1="${x1}" y1="${ay}" x2="${x2}" y2="${ay}" stroke="${p.border}" stroke-width="2" marker-end="url(#arch-arrow)" />`;
    }
  }

  return `${SCOPED_RESET}
<div style="position:relative;width:${W}px;height:${H}px;background:${p.background};">
  <div style="position:absolute;left:${PAD}px;top:${PAD}px;width:${cW - PAD * 2}px;text-align:center;font-size:${titleFontSize(slide.title)}px;font-weight:bold;overflow-wrap:break-word;word-wrap:break-word;color:${p.text};line-height:1.2">${escHtml(slide.title)}</div>
  <div style="position:absolute;left:${Math.round((cW - 60) / 2)}px;top:${PAD + 56}px;width:60px;height:3px;background:${p.accent};border-radius:2px"></div>
  ${boxesHtml}
  <svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${p.border}" /></marker></defs>
    ${connectorsSvg}
  </svg>
</div>`;
}
