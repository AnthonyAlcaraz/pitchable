#!/usr/bin/env node
/**
 * Generate showcase JPEGs for the 17 ROUND 2 slide types across 3 themes.
 * Reuses themes from the original showcase generator.
 *
 * Output: apps/api/public/showcase-round2/{theme-slug}/slide-{NN}-{TYPE}.jpeg
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

// ── Sample Content for 17 Round 2 Types ─────────────────────────

const ROUND2_SLIDES = [
  {
    slideType: 'FINANCIAL_PROJECTION',
    title: 'Revenue Grows 5x in Three Years',
    body: '2024: $2.1M, $1.4M, $700K\n2025: $5.8M, $3.2M, $2.6M\n2026: $12.4M, $6.1M, $6.3M\n2027: $24.0M, $10.8M, $13.2M',
  },
  {
    slideType: 'GO_TO_MARKET',
    title: 'Multi-Channel GTM Strategy',
    body: 'Direct Sales: Enterprise outbound with dedicated AEs targeting F500 (Q1-Q2)\nPartner Channel: SI and consulting firm reseller program (Q2-Q3)\nProduct-Led: Self-serve freemium with usage-based upgrade path (Q3-Q4)\nCommunity: Developer advocacy and open-source ecosystem growth (Ongoing)',
  },
  {
    slideType: 'PERSONA',
    title: 'Our Primary Buyer',
    body: 'Sarah Chen\nVP of Engineering, Acme Corp\nPain: Spends 6+ hours per week on presentation formatting\nPain: Inconsistent branding across 40-person team decks\nGoal: Reduce deck creation time to under 10 minutes\nGoal: Maintain brand consistency without a design team',
  },
  {
    slideType: 'TESTIMONIAL_WALL',
    title: 'What Our Customers Say',
    body: '"Cut our deck creation time from 6 hours to 10 minutes" - Sarah Chen, VP Engineering at Stripe\n\n"The AI understands our brand better than most designers" - Mark Rivera, CMO at Linear\n\n"Finally, presentations that look like they cost $10K" - Lisa Park, CEO at Vercel\n\n"Our close rate improved 23% after switching" - James Wu, Sales Lead at Notion',
  },
  {
    slideType: 'THANK_YOU',
    title: 'Thank You',
    body: 'Email: founders@pitchable.ai\nWebsite: www.pitch-able.ai\nLinkedIn: /company/pitchable\nCTA: Schedule a Demo',
  },
  {
    slideType: 'SCENARIO_ANALYSIS',
    title: 'Three Paths to $100M ARR',
    body: 'Bear: $8M revenue, 15% growth, 18-month runway, 2% market share\nBase: $15M revenue, 35% growth, 24-month runway, 5% market share\nBull: $28M revenue, 60% growth, 36-month runway, 12% market share',
  },
  {
    slideType: 'VALUE_CHAIN',
    title: 'Every Step Adds Margin',
    body: 'Raw Materials: $2.40/unit sourcing\nManufacturing: $8.60/unit production\nDistribution: $3.20/unit logistics\nRetail: $18.99/unit shelf price\nConsumer: $45 perceived value',
  },
  {
    slideType: 'GEOGRAPHIC_MAP',
    title: 'Global Revenue Distribution',
    body: 'North America: $8.2M ARR (62%)\nEurope: $3.1M ARR (24%)\nAsia Pacific: $1.2M ARR (9%)\nLatin America: $0.7M ARR (5%)',
  },
  {
    slideType: 'IMPACT_SCORECARD',
    title: 'Initiative Prioritization Matrix',
    body: 'AI Copilot: Revenue=H, Retention=H, Cost=M\nAPI Platform: Revenue=M, Retention=H, Cost=L\nMobile App: Revenue=M, Retention=M, Cost=H\nEnterprise SSO: Revenue=L, Retention=H, Cost=L',
  },
  {
    slideType: 'EXIT_STRATEGY',
    title: 'Multiple Paths to Liquidity',
    body: '2026: Secondary Sale - $50M valuation\n2027: Strategic Acquisition - $120M valuation\n2028: Series C / Growth Round - $250M valuation\n2030: IPO - $500M+ valuation',
  },
  {
    slideType: 'ORG_CHART',
    title: 'Leadership Team Structure',
    body: 'Jane Smith - CEO\nJohn Doe - CTO (reports to: Jane Smith)\nAlice Chen - VP Engineering (reports to: John Doe)\nBob Kim - VP Product (reports to: Jane Smith)\nMaria Lopez - VP Sales (reports to: Jane Smith)',
  },
  {
    slideType: 'FEATURE_COMPARISON',
    title: 'We Lead on Every Dimension',
    body: 'AI Generation\nPitchable: \u2605\u2605\u2605\u2605\u2605\nGamma: \u2605\u2605\u2605\u2605\u2606\nBeautiful.ai: \u2605\u2605\u2605\u2606\u2606\nCanva: \u2605\u2605\u2606\u2606\u2606\n\nTheme Quality\nPitchable: \u2605\u2605\u2605\u2605\u2605\nGamma: \u2605\u2605\u2605\u2606\u2606\nBeautiful.ai: \u2605\u2605\u2605\u2605\u2606\nCanva: \u2605\u2605\u2605\u2606\u2606\n\nExport Options\nPitchable: \u2605\u2605\u2605\u2605\u2605\nGamma: \u2605\u2605\u2605\u2606\u2606\nBeautiful.ai: \u2605\u2605\u2606\u2606\u2606\nCanva: \u2605\u2605\u2605\u2605\u2606',
  },
  {
    slideType: 'DATA_TABLE',
    title: 'Quarterly Performance Metrics',
    body: '| Quarter | Revenue | Growth | Customers |\n|---|---|---|---|\n| Q1 2025 | $1.2M | 45% | 120 |\n| Q2 2025 | $1.8M | 50% | 185 |\n| Q3 2025 | $2.7M | 50% | 280 |\n| Q4 2025 | $4.2M | 56% | 420 |',
  },
  {
    slideType: 'ECOSYSTEM_MAP',
    title: 'Platform Ecosystem',
    body: 'Center: Pitchable\nRing1: Figma, Notion, Slack, Google Workspace\nRing2: Zapier, HubSpot, Salesforce, Stripe, AWS',
  },
  {
    slideType: 'KPI_DASHBOARD',
    title: 'Key Performance Indicators',
    body: 'MRR: $420K (\u219118%)\nCustomers: 2,400 (\u219112%)\nNRR: 142% (\u21918%)\nCAC: $340 (\u219315%)\nChurn: 1.2% (\u219322%)\nLTV:CAC: 4.2x (\u219125%)',
  },
  {
    slideType: 'REFERENCES',
    title: 'References',
    body: '[1] Kahneman, D. (2011). Thinking, Fast and Slow. Farrar, Straus and Giroux.\n[2] Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS.\n[3] Brown, T. et al. (2020). Language Models are Few-Shot Learners. NeurIPS.\n[4] Wei, J. et al. (2022). Chain-of-Thought Prompting Elicits Reasoning. NeurIPS.',
  },
  {
    slideType: 'ABSTRACT',
    title: 'AI Presentations Outperform Manual Design',
    body: 'Objective: This study examines the impact of AI-generated presentations on audience engagement and information retention across enterprise settings.\nMethod: We conducted a randomized controlled trial with 240 participants comparing AI-generated slides against manually designed presentations across 12 topic domains.\nResults: AI-generated presentations achieved 23% higher information retention scores and 18% higher engagement ratings, with statistical significance (p < 0.01).\nConclusion: AI slide generation produces measurably superior audience outcomes while reducing creation time by 85%.\nKeywords: artificial intelligence, presentation design, audience engagement, information retention',
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
  const outBase = path.join(apiDir, 'public', 'showcase-round2');
  fs.mkdirSync(outBase, { recursive: true });

  console.log('=== Round 2 Slide Type Sample Generator ===');
  console.log(`${ROUND2_SLIDES.length} types x ${THEMES.length} themes = ${ROUND2_SLIDES.length * THEMES.length} JPEGs\n`);

  for (const theme of THEMES) {
    const themeDir = path.join(outBase, theme.slug);
    fs.mkdirSync(themeDir, { recursive: true });

    console.log(`\n--- ${theme.displayName} (${theme.slug}) ---`);

    const md = generateMarpMarkdown(theme, ROUND2_SLIDES);
    const mdPath = path.join(themeDir, 'slides.md');
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  Wrote markdown: ${mdPath}`);

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

    const generatedFiles = fs.readdirSync(themeDir)
      .filter(f => f.startsWith('slide.') && f.endsWith('.jpeg'))
      .sort();

    let renamed = 0;
    for (let i = 0; i < generatedFiles.length && i < ROUND2_SLIDES.length; i++) {
      const oldPath = path.join(themeDir, generatedFiles[i]);
      const num = String(i + 1).padStart(2, '0');
      const typeName = ROUND2_SLIDES[i].slideType;
      const newPath = path.join(themeDir, `slide-${num}-${typeName}.jpeg`);
      fs.renameSync(oldPath, newPath);
      const size = (fs.statSync(newPath).size / 1024).toFixed(0);
      console.log(`  [${num}] ${typeName} -> ${size} KB`);
      renamed++;
    }

    console.log(`  Total: ${renamed} / ${ROUND2_SLIDES.length} slides rendered`);
  }

  console.log('\n=== Summary ===');
  let total = 0;
  for (const theme of THEMES) {
    const themeDir = path.join(outBase, theme.slug);
    const jpgs = fs.readdirSync(themeDir).filter(f => f.endsWith('.jpeg') && f.startsWith('slide-'));
    console.log(`  ${theme.slug}: ${jpgs.length} / ${ROUND2_SLIDES.length}`);
    total += jpgs.length;
  }

  const expected = ROUND2_SLIDES.length * THEMES.length;
  console.log(`\n  TOTAL: ${total} / ${expected}`);
  console.log(`  Output directory: ${outBase}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
