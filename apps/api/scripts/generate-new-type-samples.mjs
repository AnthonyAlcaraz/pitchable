#!/usr/bin/env node
/**
 * Generate showcase JPEGs for the 17 NEW slide types across 3 themes.
 *
 * Types: HOOK, MATRIX_2X2, WATERFALL, FUNNEL, COMPETITIVE_MATRIX, ROADMAP,
 *        PRICING_TABLE, UNIT_ECONOMICS, SWOT, THREE_PILLARS, BEFORE_AFTER,
 *        SOCIAL_PROOF, OBJECTION_HANDLER, FAQ, VERDICT, COHORT_TABLE, PROGRESS_TRACKER
 *
 * Themes: pitchable-dark, light-minimal, mckinsey-executive
 *
 * Output: apps/api/public/showcase-new-types/{theme-slug}/slide-{NN}-{TYPE}.jpg
 *
 * Usage:
 *   node scripts/generate-new-type-samples.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { buildHtmlSlideContent } from '../dist/src/exports/html-slide-templates.js';

// ── 3 Themes ────────────────────────────────────────────────────

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
];

// ── Sample Content for 17 New Types ─────────────────────────────

const NEW_TYPE_SLIDES = [
  {
    slideType: 'HOOK',
    title: 'The $4.7 Trillion Question',
    body: 'What if every presentation you made looked like it was designed by McKinsey?',
  },
  {
    slideType: 'MATRIX_2X2',
    title: 'Strategic Priority Matrix',
    body: 'X-Axis: Speed of Implementation\nY-Axis: Business Impact\nQuick Wins: High impact, fast implementation \u2014 automation, self-service portals, API integrations\nStrategic Bets: High impact, slow implementation \u2014 platform rebuild, AI transformation\nLow Hanging Fruit: Low impact, fast \u2014 minor UI optimizations, documentation updates\nAvoid: Low impact, slow \u2014 legacy maintenance, manual reporting',
  },
  {
    slideType: 'WATERFALL',
    title: 'Revenue Bridge Q3 to Q4',
    body: 'Starting Revenue: $12M\nNew Business: +$4.2M\nExpansion: +$2.8M\nContraction: -$1.1M\nChurn: -$2.4M\nEnding Revenue: $15.5M',
  },
  {
    slideType: 'FUNNEL',
    title: 'Customer Acquisition Funnel',
    body: 'Website Visitors: 100,000 (100%)\nSign-ups: 12,000 (12%)\nActivated Users: 4,800 (4.8%)\nPaying Customers: 960 (0.96%)\nEnterprise Deals: 48 (0.048%)',
  },
  {
    slideType: 'COMPETITIVE_MATRIX',
    title: 'Feature Comparison',
    body: '| Feature | Us | Competitor A | Competitor B | Competitor C |\n|---|---|---|---|---|\n| AI Generation | \u2713 | \u2717 | \u2713 | \u2717 |\n| Real-time Collab | \u2713 | \u2713 | \u2717 | \u2717 |\n| Custom Themes | \u2713 | \u2717 | \u2717 | \u2713 |\n| API Access | \u2713 | \u2713 | \u2713 | \u2717 |\n| PPTX Export | \u2713 | \u2717 | \u2713 | \u2713 |',
  },
  {
    slideType: 'ROADMAP',
    title: 'Product Roadmap 2026',
    body: 'Now: Core platform stability, API v2 launch, Enterprise SSO, SOC 2 certification\nNext: AI copilot beta, International expansion, Partner marketplace, Custom branding\nLater: Autonomous generation, Industry-specific templates, White-label offering, Mobile app',
  },
  {
    slideType: 'PRICING_TABLE',
    title: 'Simple, Transparent Pricing',
    body: 'Starter: $0/mo\n- 5 presentations/month\n- Basic themes\n- PDF export\nPro: $29/mo (Recommended)\n- Unlimited presentations\n- All 16 premium themes\n- PDF + PPTX export\n- AI image generation\nEnterprise: Custom\n- Everything in Pro\n- Custom branding\n- SSO & SAML\n- Dedicated support',
  },
  {
    slideType: 'UNIT_ECONOMICS',
    title: 'Unit Economics That Scale',
    body: 'LTV:CAC = 4.2x\nCAC: $340 | LTV: $1,428 | Payback: 4.2 months | Gross Margin: 82% | Net Revenue Retention: 124%',
  },
  {
    slideType: 'SWOT',
    title: 'Strategic Position Analysis',
    body: 'Strengths: Strong AI capabilities, 16 premium themes, Fast generation speed, First-mover advantage\nWeaknesses: Limited offline support, No mobile app, Small engineering team\nOpportunities: Enterprise market expansion, API partnerships, International growth, Education vertical\nThreats: Big tech competition, AI commoditization, Economic slowdown, Open-source alternatives',
  },
  {
    slideType: 'THREE_PILLARS',
    title: 'Our Unfair Advantage',
    body: 'Speed: Generate complete decks in under 60 seconds with AI-powered content and design automation\nQuality: Figma-grade templates with 16 premium themes rivaling professional design agencies\nIntelligence: Context-aware AI adapts content density, tone, and visuals to your audience\n\n### Three pillars that compound into an unfair advantage',
  },
  {
    slideType: 'BEFORE_AFTER',
    title: 'The Transformation',
    body: 'Before: 4-6 hours per deck, inconsistent branding, generic templates, manual formatting\nAfter: 60-second generation, pixel-perfect themes, AI-adapted content, one-click export',
  },
  {
    slideType: 'SOCIAL_PROOF',
    title: 'Trusted by Industry Leaders',
    body: '4.9/5 average rating from 2,400+ users\nFeatured in TechCrunch, Product Hunt #1, Forbes 30 Under 30\nTrusted by teams at Stripe, Notion, Linear, Vercel, Figma',
  },
  {
    slideType: 'OBJECTION_HANDLER',
    title: 'Addressing the Skeptics',
    body: '"AI-generated slides all look the same"\nOur 16 Figma-grade themes produce slides indistinguishable from agency work. In blind tests, **78%** of executives preferred Pitchable output over manually designed decks. Each theme has **400+** unique layout combinations.',
  },
  {
    slideType: 'FAQ',
    title: 'Frequently Asked Questions',
    body: 'Q: Can I customize the AI-generated content?\nA: Yes \u2014 every slide is fully editable after generation with real-time preview\nQ: What export formats are supported?\nA: PDF, PPTX, Google Slides, and Reveal.js for web presentations\nQ: Is my data secure?\nA: SOC 2 Type II certified with end-to-end encryption and GDPR compliance',
  },
  {
    slideType: 'VERDICT',
    title: 'Investment Committee Recommendation',
    body: 'Approve: Proceed with Platform Migration\nThe analysis confirms **340bps** margin improvement potential with **18-month** payback period. Risk-adjusted NPV of **$2.1B** exceeds threshold by 3.2x. Management team has demonstrated execution capability.',
  },
  {
    slideType: 'COHORT_TABLE',
    title: 'Monthly Retention Cohorts',
    body: '| Cohort | Month 1 | Month 2 | Month 3 | Month 6 | Month 12 |\n|---|---|---|---|---|---|\n| Jan 2025 | 100% | 72% | 61% | 48% | 34% |\n| Feb 2025 | 100% | 75% | 64% | 51% | \u2014 |\n| Mar 2025 | 100% | 78% | 68% | \u2014 | \u2014 |\n| Apr 2025 | 100% | 80% | \u2014 | \u2014 | \u2014 |',
  },
  {
    slideType: 'PROGRESS_TRACKER',
    title: 'Migration Status Dashboard',
    body: 'Platform Migration: 85%\nData Integration: 62%\nUser Training: 40%\nSecurity Audit: 95%\nDocumentation: 55%',
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function isDarkBg(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

function fixStyleBlocks(html) {
  return html.replace(/<style scoped>([\s\S]*?)<\/style>/g, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed.startsWith('<div') && !trimmed.startsWith('<svg')) return match;
    const cssStart = trimmed.indexOf('section {');
    if (cssStart === -1) return match;
    return trimmed.substring(0, cssStart).trim() + '\n<style scoped>\n' + trimmed.substring(cssStart).trim() + '\n</style>';
  });
}

function buildCssPreamble(theme) {
  const { palette, headingFont, bodyFont } = theme;
  const dark = isDarkBg(palette.background);

  const systemFonts = new Set(['Georgia', 'Arial', 'Times New Roman', 'Helvetica', 'Verdana', 'Courier New']);
  const fontsToImport = [...new Set([headingFont, bodyFont])].filter(f => !systemFonts.has(f));
  const fontImportUrl = fontsToImport
    .map(f => f.replace(/ /g, '+'))
    .map(f => `family=${f}:wght@400;600;700`)
    .join('&');

  return `<style>
  ${fontImportUrl ? `@import url('https://fonts.googleapis.com/css2?${fontImportUrl}&display=swap');` : '/* System fonts only */'}

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

  h1, h2, h3 {
    font-family: '${headingFont}', sans-serif;
    color: ${palette.primary};
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

  ul, ol { margin: 8px 0; padding-left: 24px; }
  li {
    margin-bottom: 6px;
    color: ${palette.text};
    font-size: 17px;
    line-height: 1.4;
  }
  li::marker { color: ${palette.accent}; }

  section div[style*="position:absolute"],
  section div[style*="position: absolute"] {
    box-sizing: border-box;
  }

  svg text { font-family: '${bodyFont}', '${headingFont}', sans-serif; }

  foreignObject div, foreignObject p, foreignObject span {
    font-family: '${bodyFont}', sans-serif;
    line-height: 1.4;
    box-sizing: border-box;
  }

  section img:not([alt*="bg"]) { object-fit: cover; border-radius: 0; }

  .mood-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  section > div {
    position: relative;
    z-index: 1;
  }

  .glass-card {
    background: ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)'};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)'};
    box-shadow: ${dark ? '0 4px 30px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.05)'};
    border-radius: 16px;
    padding: 20px 24px;
  }

  li:nth-child(4n+1) strong { color: ${palette.accent}; }
  li:nth-child(4n+2) strong { color: ${palette.primary}; }
  li:nth-child(4n+3) strong { color: ${palette.success}; }
  li:nth-child(4n+4) strong { color: ${palette.secondary}; }

  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
</style>`;
}

/**
 * Generate one Marp markdown file for a theme containing all 17 slides.
 */
function generateMarpMarkdown(theme, slides) {
  const { palette } = theme;
  const lines = [];

  lines.push('---');
  lines.push('marp: true');
  lines.push('theme: default');
  lines.push('paginate: false');
  lines.push('---');
  lines.push('');
  lines.push(buildCssPreamble(theme));
  lines.push('');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    if (i > 0) {
      lines.push('---');
      lines.push('');
    }

    lines.push(`<!-- _backgroundColor: ${palette.background} -->`);
    lines.push(`<!-- _color: ${palette.text} -->`);
    lines.push('');

    const slideInput = {
      title: slide.title,
      body: slide.body,
      slideType: slide.slideType,
    };

    let html = buildHtmlSlideContent(slideInput, palette, { accentColorDiversity: true });
    html = fixStyleBlocks(html);
    lines.push(html);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const apiDir = path.resolve(__dirname, '..');
  const outBase = path.join(apiDir, 'public', 'showcase-new-types');
  fs.mkdirSync(outBase, { recursive: true });

  console.log('=== New Slide Type Sample Generator ===');
  console.log(`${NEW_TYPE_SLIDES.length} types x ${THEMES.length} themes = ${NEW_TYPE_SLIDES.length * THEMES.length} JPEGs\n`);

  for (const theme of THEMES) {
    const themeDir = path.join(outBase, theme.slug);
    fs.mkdirSync(themeDir, { recursive: true });

    console.log(`\n--- ${theme.displayName} (${theme.slug}) ---`);

    // 1. Generate Marp markdown with all 17 slides
    const md = generateMarpMarkdown(theme, NEW_TYPE_SLIDES);
    const mdPath = path.join(themeDir, 'slides.md');
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  Wrote markdown: ${mdPath}`);

    // 2. Render via Marp CLI to individual JPEGs
    const outPattern = path.join(themeDir, 'slide.jpeg');
    try {
      execSync(
        `npx @marp-team/marp-cli "${mdPath}" --images jpeg --jpeg-quality 90 --html --allow-local-files -o "${outPattern}"`,
        { cwd: apiDir, stdio: 'pipe', timeout: 120_000 },
      );
    } catch (err) {
      console.error(`  ERROR rendering ${theme.slug}:`, err.stderr?.toString()?.slice(0, 500) || err.message);
      continue;
    }

    // 3. Rename from slide.NNN.jpeg -> slide-NN-TYPE.jpeg
    const generatedFiles = fs.readdirSync(themeDir)
      .filter(f => f.startsWith('slide.') && f.endsWith('.jpeg'))
      .sort();

    let renamed = 0;
    for (let i = 0; i < generatedFiles.length && i < NEW_TYPE_SLIDES.length; i++) {
      const oldPath = path.join(themeDir, generatedFiles[i]);
      const num = String(i + 1).padStart(2, '0');
      const typeName = NEW_TYPE_SLIDES[i].slideType;
      const newPath = path.join(themeDir, `slide-${num}-${typeName}.jpeg`);
      fs.renameSync(oldPath, newPath);
      const size = (fs.statSync(newPath).size / 1024).toFixed(0);
      console.log(`  [${num}] ${typeName} -> ${size} KB`);
      renamed++;
    }

    console.log(`  Total: ${renamed} / ${NEW_TYPE_SLIDES.length} slides rendered`);
  }

  // Summary
  console.log('\n=== Summary ===');
  let total = 0;
  for (const theme of THEMES) {
    const themeDir = path.join(outBase, theme.slug);
    const jpgs = fs.readdirSync(themeDir).filter(f => f.endsWith('.jpeg') && f.startsWith('slide-'));
    console.log(`  ${theme.slug}: ${jpgs.length} / ${NEW_TYPE_SLIDES.length}`);
    total += jpgs.length;
  }

  const expected = NEW_TYPE_SLIDES.length * THEMES.length;
  console.log(`\n  TOTAL: ${total} / ${expected}`);

  if (total === expected) {
    console.log('  All samples generated successfully!');
  } else {
    console.log('  WARNING: Some samples may be missing.');
  }

  console.log(`\n  Output directory: ${outBase}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
