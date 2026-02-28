#!/usr/bin/env node
/**
 * Generate showcase slide JPEGs for all 16 themes and upload to S3.
 *
 * For each theme: generates 8 slides (diverse types), renders via Marp CLI,
 * uploads JPEGs to S3, and writes a JSON manifest.
 *
 * Usage:
 *   node scripts/generate-showcase.mjs
 *
 * Requires: .env with S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import { buildHtmlSlideContent } from '../dist/src/exports/html-slide-templates.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// ── S3 Configuration ──────────────────────────────────────────
// Support both S3_* (Railway/production) and MINIO_* (local) env vars

const s3Endpoint = process.env.S3_ENDPOINT
  || (process.env.MINIO_ENDPOINT
    ? `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || '9000'}`
    : null);
const s3AccessKey = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
const s3SecretKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

if (!s3Endpoint || !s3AccessKey || !s3SecretKey) {
  console.error('ERROR: Missing S3 environment variables (S3_ENDPOINT/MINIO_ENDPOINT, S3_ACCESS_KEY/MINIO_ROOT_USER, S3_SECRET_KEY/MINIO_ROOT_PASSWORD)');
  console.error('Load from .env or set them before running.');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: s3Endpoint,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
  forcePathStyle: true, // MinIO / R2 compatibility
});
const S3_BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'pitchable-documents';

// ── Theme Definitions (all 16) ─────────────────────────────────

const THEMES = [
  {
    slug: 'pitchable-dark',
    displayName: 'Pitchable Dark',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#3b82f6', secondary: '#64748b',
      accent: '#22d3ee', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#22c55e', warning: '#f59e0b', error: '#ef4444',
    },
  },
  {
    slug: 'dark-professional',
    displayName: 'Dark Professional',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    palette: {
      background: '#0f172a', primary: '#f8fafc', secondary: '#94a3b8',
      accent: '#fbbf24', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#4ade80', warning: '#fbbf24', error: '#f87171',
    },
  },
  {
    slug: 'creative-warm',
    displayName: 'Creative Warm',
    headingFont: 'DM Sans',
    bodyFont: 'Lato',
    palette: {
      background: '#1c1917', primary: '#f97316', secondary: '#facc15',
      accent: '#fbbf24', text: '#fafaf9', surface: '#292524',
      border: '#44403c', success: '#4ade80', warning: '#facc15', error: '#f87171',
    },
  },
  {
    slug: 'technical-teal',
    displayName: 'Technical Teal',
    headingFont: 'Nunito Sans',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#14b8a6', secondary: '#06b6d4',
      accent: '#8b5cf6', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#34d399', warning: '#fbbf24', error: '#fb7185',
    },
  },
  {
    slug: 'light-minimal',
    displayName: 'Light Minimal',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#ffffff', primary: '#1e293b', secondary: '#64748b',
      accent: '#3b82f6', text: '#1e293b', surface: '#f8fafc',
      border: '#e2e8f0', success: '#22c55e', warning: '#f59e0b', error: '#ef4444',
    },
  },
  {
    slug: 'corporate-blue',
    displayName: 'Corporate Blue',
    headingFont: 'Poppins',
    bodyFont: 'Open Sans',
    palette: {
      background: '#f8fafc', primary: '#1e40af', secondary: '#3b82f6',
      accent: '#f59e0b', text: '#1e293b', surface: '#ffffff',
      border: '#e2e8f0', success: '#16a34a', warning: '#f59e0b', error: '#dc2626',
    },
  },
  {
    slug: 'mckinsey-executive',
    displayName: 'McKinsey Executive',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    palette: {
      background: '#FFFFFF', primary: '#051C2C', secondary: '#6B7280',
      accent: '#2251FF', text: '#1F2937', surface: '#F9FAFB',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'apple-keynote',
    displayName: 'Apple Keynote',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#000000', primary: '#FFFFFF', secondary: '#A1A1AA',
      accent: '#007AFF', text: '#F4F4F5', surface: '#18181B',
      border: '#27272A', success: '#34D399', warning: '#FBBF24', error: '#F87171',
    },
  },
  {
    slug: 'ted-talk',
    displayName: 'TED Talk',
    headingFont: 'Montserrat',
    bodyFont: 'Lato',
    palette: {
      background: '#1A1A1A', primary: '#FFFFFF', secondary: '#9CA3AF',
      accent: '#EB0028', text: '#E5E7EB', surface: '#262626',
      border: '#404040', success: '#22C55E', warning: '#EAB308', error: '#EF4444',
    },
  },
  {
    slug: 'yc-startup',
    displayName: 'YC Startup',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    palette: {
      background: '#FFFFFF', primary: '#18181B', secondary: '#71717A',
      accent: '#F97316', text: '#18181B', surface: '#FAFAFA',
      border: '#E4E4E7', success: '#22C55E', warning: '#EAB308', error: '#EF4444',
    },
  },
  {
    slug: 'sequoia-capital',
    displayName: 'Sequoia Capital',
    headingFont: 'Source Serif Pro',
    bodyFont: 'Inter',
    palette: {
      background: '#FFFFFF', primary: '#14532D', secondary: '#6B7280',
      accent: '#16A34A', text: '#1F2937', surface: '#F9FAFB',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'airbnb-story',
    displayName: 'Airbnb Story',
    headingFont: 'Poppins',
    bodyFont: 'Lato',
    palette: {
      background: '#FFFFFF', primary: '#1F2937', secondary: '#9CA3AF',
      accent: '#FF5A5F', text: '#1F2937', surface: '#FFF7F7',
      border: '#FFE4E6', success: '#10B981', warning: '#F59E0B', error: '#EF4444',
    },
  },
  {
    slug: 'stripe-fintech',
    displayName: 'Stripe Fintech',
    headingFont: 'Montserrat',
    bodyFont: 'Source Sans Pro',
    palette: {
      background: '#0A0A23', primary: '#E2E8F0', secondary: '#94A3B8',
      accent: '#635BFF', text: '#E2E8F0', surface: '#1A1A3E',
      border: '#2D2D5F', success: '#22C55E', warning: '#F59E0B', error: '#F87171',
    },
  },
  {
    slug: 'bcg-strategy',
    displayName: 'BCG Strategy',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    palette: {
      background: '#F9FAFB', primary: '#1E3A2F', secondary: '#6B7280',
      accent: '#059669', text: '#1F2937', surface: '#FFFFFF',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'z4-dark-premium',
    displayName: 'Z4 Dark Premium',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#60a5fa', secondary: '#818cf8',
      accent: '#fbbf24', text: '#f1f5f9', surface: '#1e293b',
      border: '#334155', success: '#4ade80', warning: '#fbbf24', error: '#f87171',
    },
  },
  {
    slug: 'academic-research',
    displayName: 'Academic Research',
    headingFont: 'Libre Baskerville',
    bodyFont: 'Source Sans Pro',
    palette: {
      background: '#FFFDF7', primary: '#1E3A5F', secondary: '#64748B',
      accent: '#2563EB', text: '#1F2937', surface: '#FFF8E7',
      border: '#E5E1D5', success: '#059669', warning: '#D97706', error: '#B91C1C',
    },
  },
];

// ── Stock Images ───────────────────────────────────────────────

const UNSPLASH_URLS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
];

// ── Slide Definitions ──────────────────────────────────────────

/**
 * Build the 8 showcase slides for a theme.
 * Slides 1-3: no image (Figma-grade HTML types)
 * Slides 4-6: with imageUrl (Figma-grade HTML types, right-panel image)
 * Slides 7-8: background image via Marp `![bg]` directive
 */
function getSlides(imgDir) {
  const img = (i) => path.resolve(imgDir, `img-${i}.jpg`).replace(/\\/g, '/');
  return [
    {
      slideNumber: 1,
      slideType: 'PROBLEM',
      title: 'The Hidden Cost of Legacy Systems',
      body: [
        '72% of enterprises still run critical workflows on 15+ year old platforms',
        'Average downtime costs $5,600 per minute across Fortune 500 companies',
        'Technical debt compounds at 25% annually without systematic remediation',
        'Migration delays correlate with 3.2x higher security breach probability',
      ].join('\n'),
      hasImage: false,
    },
    {
      slideNumber: 2,
      slideType: 'METRICS_HIGHLIGHT',
      title: '$4.2M Annual Revenue Loss',
      body: [
        '$4.2M lost annually from manual process inefficiencies across departments',
        '340 hours per employee wasted on redundant data entry and reconciliation',
        '89% reduction in processing errors after intelligent automation deployment',
      ].join('\n'),
      hasImage: false,
    },
    {
      slideNumber: 3,
      slideType: 'TIMELINE',
      title: 'Strategic Roadmap to Market Leadership',
      body: [
        'Q1 2025: Foundation phase with core platform build and pilot customer onboarding',
        'Q2 2025: Scale phase with enterprise API launch and SOC 2 Type II certification',
        'Q3 2025: Growth phase targeting 500 enterprise accounts and Series A raise',
        'Q4 2025: Expansion into EMEA and APAC markets with localized offerings',
      ].join('\n'),
      hasImage: false,
    },
    {
      slideNumber: 4,
      slideType: 'SOLUTION',
      title: 'Intelligent Automation Platform',
      body: [
        'AI-powered document processing that learns from every interaction and improves accuracy',
        'Real-time decision engine with explainable outputs for regulatory compliance',
        'Seamless integration with existing enterprise systems via pre-built connectors',
      ].join('\n'),
      hasImage: true,
      imageUrl: img(0),
    },
    {
      slideNumber: 5,
      slideType: 'FEATURE_GRID',
      title: 'Four Capabilities That Drive Results',
      body: [
        'Smart Extraction: ML-powered data capture from any document format with 99.2% accuracy',
        'Workflow Engine: Visual drag-and-drop automation builder for complex business processes',
        'Analytics Hub: Real-time dashboards with predictive insights and anomaly detection',
        'Security Vault: End-to-end encryption with role-based access and full audit trails',
      ].join('\n'),
      hasImage: true,
      imageUrl: img(1),
    },
    {
      slideNumber: 6,
      slideType: 'ARCHITECTURE',
      title: 'Cloud-Native Architecture',
      body: [
        'Presentation Layer: React SPA with WebSocket real-time updates and CDN edge caching',
        'API Gateway: Rate limiting, JWT auth, request routing across microservices',
        'Processing Core: Kubernetes-orchestrated ML pipelines with auto-scaling workers',
        'Data Layer: PostgreSQL primary store, Redis cache, S3 document storage, vector DB',
      ].join('\n'),
      hasImage: true,
      imageUrl: img(2),
    },
    {
      slideNumber: 7,
      slideType: 'CTA',
      title: 'Take the Next Step',
      body: [
        'Schedule a personalized demo with our solutions engineering team',
        'Start your 14-day free trial with full enterprise features enabled',
        'Join 200+ companies already transforming their operations',
      ].join('\n'),
      hasImage: true, // bg image via Marp directive
      bgImagePath: img(3),
    },
    {
      slideNumber: 8,
      slideType: 'CONTENT',
      title: 'Deep Dive: AI-Driven Analytics',
      body: [
        'Our analytics engine processes over 10 million data points daily, transforming raw operational data into actionable intelligence that drives measurable business outcomes.',
        'Machine learning models continuously adapt to your organization\'s unique patterns, reducing false positives by 94% compared to rule-based systems.',
        'Executive dashboards provide C-suite visibility with drill-down capabilities from strategic KPIs to individual transaction-level detail.',
      ].join('\n'),
      hasImage: true, // bg image via Marp directive
      bgImagePath: img(4),
    },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────

function isDarkBg(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Build comprehensive Marp CSS preamble for a theme.
 * Must handle both Figma-grade HTML content and standard Marp markdown.
 */
function buildCssPreamble(theme) {
  const { palette, headingFont, bodyFont } = theme;
  const dark = isDarkBg(palette.background);

  // Google Fonts import for the fonts used (skip system fonts)
  const systemFonts = new Set(['Georgia', 'Arial', 'Times New Roman', 'Helvetica', 'Verdana', 'Courier New']);
  const fontsToImport = [...new Set([headingFont, bodyFont])].filter(f => !systemFonts.has(f));
  const fontImportUrl = fontsToImport
    .map((f) => f.replace(/ /g, '+'))
    .map((f) => `family=${f}:wght@400;600;700`)
    .join('&');

  return `<style>
  ${fontImportUrl ? `@import url('https://fonts.googleapis.com/css2?${fontImportUrl}&display=swap');` : '/* System fonts only — no Google Fonts import */'}

  /* ── Base Section ─────────────────────────────── */
  section {
    width: 1280px;
    height: 720px;
    background: ${palette.background};
    color: ${palette.text};
    font-family: '${bodyFont}', sans-serif;
    font-size: 18px;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    overflow: hidden;
    position: relative;
  }

  /* ── Typography ───────────────────────────────── */
  h1, h2, h3 {
    font-family: '${headingFont}', sans-serif;
    color: ${dark ? palette.primary : palette.primary};
    margin: 0;
    padding: 0;
    line-height: 1.2;
  }
  h1 { font-size: 40px; font-weight: 700; }
  h1::after {
    content: '';
    display: block;
    width: 60px;
    height: 3px;
    background: ${palette.accent};
    margin-top: 8px;
    border-radius: 2px;
  }
  h2 { font-size: 28px; font-weight: 600; color: ${palette.secondary}; }
  h3 { font-size: 22px; font-weight: 600; }
  p { margin: 8px 0; color: ${palette.text}; }
  strong { color: ${palette.accent}; font-weight: 700; }
  em { color: ${palette.secondary}; }

  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  li {
    margin-bottom: 6px;
    color: ${palette.text};
    font-size: 17px;
    line-height: 1.4;
  }
  li::marker {
    color: ${palette.accent};
  }

  /* ── Figma-grade HTML Template Styles ─────────── */
  /* These ensure the SVG+HTML templates render correctly inside Marp */

  /* Container resets for absolute positioning */
  section div[style*="position:absolute"],
  section div[style*="position: absolute"] {
    box-sizing: border-box;
  }

  /* SVG text rendering */
  svg text {
    font-family: '${bodyFont}', '${headingFont}', sans-serif;
  }

  /* foreignObject HTML rendering */
  foreignObject div, foreignObject p, foreignObject span {
    font-family: '${bodyFont}', sans-serif;
    line-height: 1.4;
    box-sizing: border-box;
  }

  /* Image overlay panels (30% right side) */
  section img:not([alt*="bg"]) {
    object-fit: cover;
    border-radius: 0;
  }

  /* Mood overlay for dark themes */
  .mood-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Ensure HTML template content sits above backgrounds */
  section > div {
    position: relative;
    z-index: 1;
  }

  /* ── Glass card styling ──────────────────────── */
  .glass-card {
    background: ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)'};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)'};
    box-shadow: ${dark ? '0 4px 30px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.05)'};
    border-radius: 16px;
    padding: 20px 24px;
  }

  /* ── Accent color rotation on bold text ──────── */
  li:nth-child(4n+1) strong { color: ${palette.accent}; }
  li:nth-child(4n+2) strong { color: ${palette.primary}; }
  li:nth-child(4n+3) strong { color: ${palette.success}; }
  li:nth-child(4n+4) strong { color: ${palette.secondary}; }

  /* ── Background image slides (7, 8) ──────────── */
  section[data-bg-image="true"] {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 80px;
  }
  section[data-bg-image="true"] h1 {
    font-size: 44px;
    color: ${dark ? '#FFFFFF' : palette.primary};
    text-shadow: ${dark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 1px 4px rgba(255,255,255,0.7)'};
    margin-bottom: 16px;
  }
  section[data-bg-image="true"] h1::after {
    background: ${palette.accent};
    width: 80px;
    height: 4px;
  }
  section[data-bg-image="true"] p,
  section[data-bg-image="true"] li {
    color: ${dark ? 'rgba(255,255,255,0.95)' : palette.text};
    font-size: 20px;
    text-shadow: ${dark ? '0 1px 4px rgba(0,0,0,0.4)' : 'none'};
  }
  section[data-bg-image="true"] strong {
    color: ${palette.accent};
  }

  /* ── Scrollbar and overflow ──────────────────── */
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
</style>`;
}

/**
 * Generate a single Marp markdown file for a theme containing all 8 slides.
 */
/**
 * Fix mood overlay HTML that buildHtmlSlideContent injects inside <style scoped> blocks.
 * Moves any HTML elements (divs, SVGs) from inside <style scoped> to before it.
 */
function fixStyleBlocks(html) {
  // Pattern: <style scoped> followed by HTML elements before CSS rules
  return html.replace(/<style scoped>([\s\S]*?)<\/style>/g, (match, inner) => {
    // Check if the style block contains HTML elements
    const trimmed = inner.trim();
    if (!trimmed.startsWith('<div') && !trimmed.startsWith('<svg')) {
      return match; // Pure CSS, leave as-is
    }
    // Split: HTML part is everything before "section {", CSS part is from "section {" onwards
    const cssStart = trimmed.indexOf('section {');
    if (cssStart === -1) return match; // No CSS rules found, leave as-is
    const htmlPart = trimmed.substring(0, cssStart).trim();
    const cssPart = trimmed.substring(cssStart).trim();
    return htmlPart + '\n<style scoped>\n' + cssPart + '\n</style>';
  });
}

function generateMarpMarkdown(theme, slides) {
  const { palette } = theme;
  const lines = [];

  // Marp frontmatter
  lines.push('---');
  lines.push('marp: true');
  lines.push('theme: default');
  lines.push('paginate: false');
  lines.push('---');
  lines.push('');

  // CSS preamble (first slide carries all styles)
  lines.push(buildCssPreamble(theme));
  lines.push('');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    if (i > 0) {
      lines.push('---');
      lines.push('');
    }

    // Per-slide background/color directives
    lines.push(`<!-- _backgroundColor: ${palette.background} -->`);
    lines.push(`<!-- _color: ${palette.text} -->`);
    lines.push('');

    if (slide.bgImagePath) {
      // Slides 7-8: background image via Marp directive + markdown content
      lines.push(`![bg opacity:0.25](${slide.bgImagePath})`);
      lines.push('');
      lines.push(`<!-- _class: "" -->`);
      lines.push(`<div data-bg-image="true" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:60px 80px;">`);
      lines.push('');
      lines.push(`<h1 style="font-family:'${theme.headingFont}',sans-serif;font-size:44px;color:${isDarkBg(palette.background) ? '#FFFFFF' : palette.primary};margin-bottom:12px;">${slide.title}</h1>`);
      lines.push(`<div style="width:80px;height:4px;background:${palette.accent};border-radius:2px;margin-bottom:24px;"></div>`);
      lines.push('');
      const bodyLines = slide.body.split('\n').filter(Boolean);
      lines.push('<ul style="list-style:none;padding:0;margin:0;">');
      for (const line of bodyLines) {
        lines.push(`<li style="font-family:'${theme.bodyFont}',sans-serif;font-size:20px;color:${isDarkBg(palette.background) ? 'rgba(255,255,255,0.95)' : palette.text};margin-bottom:12px;padding-left:20px;position:relative;"><span style="position:absolute;left:0;color:${palette.accent};">&#9656;</span>${line}</li>`);
      }
      lines.push('</ul>');
      lines.push('</div>');
    } else {
      // Slides 1-6: Figma-grade HTML content via buildHtmlSlideContent
      const slideInput = {
        title: slide.title,
        body: slide.body,
        slideType: slide.slideType,
        ...(slide.imageUrl ? { imageUrl: slide.imageUrl } : {}),
      };

      let html = buildHtmlSlideContent(slideInput, palette, { accentColorDiversity: true });

      // Post-process: fix mood overlay HTML injected inside <style scoped> blocks
      html = fixStyleBlocks(html);


      // Inject the raw HTML directly into the Marp slide
      lines.push(html);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ── Image Download ─────────────────────────────────────────────

async function downloadImages(imgDir) {
  fs.mkdirSync(imgDir, { recursive: true });

  console.log(`Downloading ${UNSPLASH_URLS.length} stock images...`);
  const results = await Promise.allSettled(
    UNSPLASH_URLS.map(async (url, i) => {
      const dest = path.join(imgDir, `img-${i}.jpg`);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
        console.log(`  [${i}] Cached: ${dest}`);
        return;
      }
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const fileStream = fs.createWriteStream(dest);
      await pipeline(Readable.fromWeb(res.body), fileStream);
      console.log(`  [${i}] Downloaded: ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`WARNING: ${failed.length} image download(s) failed:`);
    for (const f of failed) console.warn(`  ${f.reason?.message || f.reason}`);
  }
  return failed.length === 0;
}

// ── Marp Rendering ─────────────────────────────────────────────

function renderMarpSlides(mdPath, outputBase) {
  const cmd = [
    'npx', '@marp-team/marp-cli',
    JSON.stringify(mdPath),
    '--images', 'jpeg',
    '--jpeg-quality', '85',
    '--html',
    '--allow-local-files',
    '-o', JSON.stringify(outputBase + '.jpeg'),
  ].join(' ');

  console.log(`  Rendering: ${path.basename(mdPath)}`);
  execSync(cmd, {
    cwd: path.resolve(import.meta.dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120_000,
  });
}

// ── S3 Upload ──────────────────────────────────────────────────

async function uploadToS3(localPath, s3Key) {
  const body = fs.readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('=== Pitchable Showcase Generator ===\n');

  // S3 config validated at module level

  // Create temp directories
  const tmpBase = path.join(os.tmpdir(), 'pitchable-showcase');
  const imgDir = path.join(tmpBase, 'images');
  const marpDir = path.join(tmpBase, 'marp');
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(marpDir, { recursive: true });

  // Download stock images
  await downloadImages(imgDir);

  // Build slide definitions (shared across themes, only differs by imageUrl paths)
  const slides = getSlides(imgDir);

  const manifest = {
    generated: new Date().toISOString(),
    themes: [],
  };

  const succeeded = [];
  const failed = [];

  for (const theme of THEMES) {
    console.log(`\n--- Theme: ${theme.displayName} (${theme.slug}) ---`);
    try {
      // 1. Generate Marp markdown
      const mdPath = path.join(marpDir, `${theme.slug}.md`);
      const mdContent = generateMarpMarkdown(theme, slides);
      fs.writeFileSync(mdPath, mdContent, 'utf-8');

      // 2. Render via Marp CLI
      const outputBase = path.join(marpDir, theme.slug);
      renderMarpSlides(mdPath, outputBase);

      // 3. Find generated JPEG files (Marp outputs .001.jpeg, .002.jpeg, etc.)
      const themeManifest = {
        slug: theme.slug,
        displayName: theme.displayName,
        slides: [],
      };

      for (let s = 0; s < slides.length; s++) {
        const jpegNum = String(s + 1).padStart(3, '0');
        const jpegPath = `${outputBase}.${jpegNum}.jpeg`;

        if (!fs.existsSync(jpegPath)) {
          console.warn(`  WARNING: Missing ${path.basename(jpegPath)}`);
          continue;
        }

        const s3Key = `showcase/${theme.slug}/${s + 1}.jpeg`;
        try {
          await uploadToS3(jpegPath, s3Key);
          console.log(`  Uploaded: s3://${S3_BUCKET}/${s3Key} (${(fs.statSync(jpegPath).size / 1024).toFixed(0)} KB)`);
        } catch (s3Err) {
          console.log(`  Local only: ${path.basename(jpegPath)} (${(fs.statSync(jpegPath).size / 1024).toFixed(0)} KB) — S3 upload skipped: ${s3Err.message || 'unavailable'}`);
        }

        themeManifest.slides.push({
          slideNumber: s + 1,
          slideType: slides[s].slideType,
          title: slides[s].title,
          hasImage: slides[s].hasImage,
          s3Key,
        });
      }

      manifest.themes.push(themeManifest);
      succeeded.push(theme.slug);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      if (err.stderr) console.error(`  STDERR: ${err.stderr.toString().slice(0, 500)}`);
      failed.push({ slug: theme.slug, error: err.message });
    }
  }

  // Write manifest
  const manifestPath = path.resolve(import.meta.dirname, 'showcase-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nManifest written: ${manifestPath}`);

  // Cleanup temp markdown files (keep images cached)
  // fs.rmSync(marpDir, { recursive: true, force: true });

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Summary ===');
  console.log(`Succeeded: ${succeeded.length}/${THEMES.length} themes`);
  if (failed.length > 0) {
    console.log('Failed:');
    for (const f of failed) console.log(`  - ${f.slug}: ${f.error}`);
  }
  console.log(`Total slides uploaded: ${manifest.themes.reduce((n, t) => n + t.slides.length, 0)}`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`Temp dir: ${tmpBase}`);

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
