#!/usr/bin/env node
/**
 * Marp Render Validation E2E Test
 *
 * Validates: template -> Marp markdown -> JPEG render -> buffer checks
 * Run: node test/marp-render-validation.mjs
 */

import { writeFile, readFile, readdir, mkdir, unlink, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Dynamic import of compiled templates
let buildHtmlSlideContent, FIGMA_GRADE_TYPES;
try {
  const mod = await import(join(ROOT, 'dist', 'src', 'exports', 'html-slide-templates.js'));
  buildHtmlSlideContent = mod.buildHtmlSlideContent;
  FIGMA_GRADE_TYPES = mod.FIGMA_GRADE_TYPES;
} catch (e) {
  console.error('Failed to import compiled templates. Run `npx tsc` first.');
  console.error(e.message);
  process.exit(1);
}

// -- Test palettes (representative: dark, light, consulting) --

const PALETTES = {
  'pitchable-dark': {
    primary: '#60A5FA', secondary: '#A78BFA', accent: '#38BDF8',
    background: '#0F172A', text: '#E2E8F0', surface: '#1E293B',
    border: '#334155', success: '#4ADE80', warning: '#FBBF24', error: '#F87171',
  },
  'light-minimal': {
    primary: '#2563EB', secondary: '#7C3AED', accent: '#0EA5E9',
    background: '#FFFFFF', text: '#1E293B', surface: '#F8FAFC',
    border: '#E2E8F0', success: '#22C55E', warning: '#EAB308', error: '#EF4444',
  },
  'mckinsey-executive': {
    primary: '#003A70', secondary: '#005B96', accent: '#B8860B',
    background: '#FFFFFF', text: '#2C2C2C', surface: '#F5F5F0',
    border: '#D4D4D4', success: '#2E7D32', warning: '#F57F17', error: '#C62828',
  },
};

// -- Test data for each Figma-grade slide type --

const SLIDE_DATA = {
  COMPARISON: {
    title: 'Traditional Approach vs. AI-Powered Pipeline: A Comprehensive Analysis',
    body: '| Feature | Traditional | AI-Powered |\n|---|---|---|\n| Speed | 2-4 weeks | 2-4 hours |\n| Accuracy | 78% | 96% |\n| Cost | $50K/month | $5K/month |\n| Scalability | Limited | Unlimited |',
  },
  TIMELINE: {
    title: 'Product Development Roadmap 2026',
    body: '1. **Q1 2026** — MVP Launch with core features\n2. **Q2 2026** — Enterprise tier and API\n3. **Q3 2026** — International expansion\n4. **Q4 2026** — AI-powered analytics suite',
  },
  METRICS_HIGHLIGHT: {
    title: 'Key Performance Indicators',
    body: '**$2.4M** ARR achieved in 18 months\n**340%** year-over-year growth rate\n**98.7%** customer retention rate\n**4.8/5** average NPS score',
  },
  MARKET_SIZING: {
    title: 'Total Addressable Market',
    body: '**$84B** TAM — Global enterprise software market\n**$12B** SAM — AI-powered SaaS tools\n**$2.1B** SOM — Presentation automation niche',
  },
  TEAM: {
    title: 'Leadership Team',
    body: '**Sarah Chen** — CEO, ex-Google VP\n**Marcus Williams** — CTO, 15yr distributed systems\n**Dr. Lisa Park** — Chief AI Officer, Stanford PhD',
  },
  FEATURE_GRID: {
    title: 'Platform Capabilities',
    body: '**AI Generation** — One-click deck creation from any input\n**Brand Compliance** — Automatic style enforcement\n**Collaboration** — Real-time multi-user editing\n**Analytics** — Engagement tracking and insights',
  },
  PROCESS: {
    title: 'How Our Platform Works',
    body: 'The process follows a streamlined three-step workflow. First, users upload their content or provide a topic. Then our AI analyzes the material, identifies key themes, and generates structured slides. Finally, the platform applies brand-consistent styling and exports to any format.',
  },
  PROBLEM: {
    title: 'The $340B Productivity Problem',
    body: 'Knowledge workers spend an average of 8 hours per week creating presentations. This translates to over $340 billion in lost productivity annually across Fortune 500 companies alone. The tools available today were designed for manual creation, not the AI-first era.',
  },
  SOLUTION: {
    title: 'AI-Native Presentation Engine',
    body: 'Our platform reduces deck creation from hours to minutes. By combining large language models with design intelligence, we generate presentation-ready slides that match enterprise brand guidelines automatically.',
  },
  CTA: {
    title: 'Join the Presentation Revolution',
    body: 'Start your free trial today and experience the future of enterprise presentations. No credit card required.',
  },
  QUOTE: {
    title: 'What Our Customers Say',
    body: '"This tool has completely transformed how our team prepares for client meetings. What used to take a full day now takes 30 minutes." — Sarah Johnson, VP Strategy at Deloitte',
  },
  ARCHITECTURE: {
    title: 'System Architecture Overview',
    body: 'Our cloud-native architecture leverages microservices for scalability. The AI engine processes requests through a multi-stage pipeline: content analysis, structure generation, visual design, and brand validation. Each stage runs independently for maximum throughput.',
  },
};

// -- JPEG validation helpers --

function parseJpegDimensions(buf) {
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const segLen = buf.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  return null;
}

function validateJpeg(buf, slideType, themeName) {
  const issues = [];

  if (buf.length < 10_000) {
    issues.push(`Too small (${(buf.length / 1024).toFixed(1)}KB)`);
  }

  if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
    issues.push('Invalid JPEG header');
  }

  const dims = parseJpegDimensions(buf);
  if (dims && (dims.width !== 1280 || dims.height !== 720)) {
    issues.push(`Wrong dimensions: ${dims.width}x${dims.height}`);
  }

  return { valid: issues.length === 0, issues, size: buf.length, dims };
}

// -- Marp markdown generation --

function generateMarpMarkdown(slideType, slideData, palette) {
  const bg = palette.background;
  const text = palette.text;
  const primary = palette.primary;
  const accent = palette.accent;

  const frontmatter = [
    '---',
    'marp: true',
    'theme: default',
    `backgroundColor: ${bg}`,
    `color: ${text}`,
    'style: |',
    '  section {',
    `    color: ${text};`,
    '    font-family: Inter, sans-serif;',
    '    font-size: 28px;',
    '    overflow: hidden;',
    '    padding: 32px 40px 40px 40px;',
    '    display: flex;',
    '    flex-direction: column;',
    '    justify-content: center;',
    '  }',
    '  h1 {',
    `    color: ${primary};`,
    '    font-size: 1.6em;',
    '    margin-top: 0;',
    '  }',
    `  strong { color: ${accent}; }`,
    `  .big-number { font-size: 3.5em; font-weight: 800; color: ${accent}; }`,
    '  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; text-align: center; }',
    '  img { max-height: 280px; margin: 4px auto; }',
    '---',
  ].join('\n');

  const htmlContent = buildHtmlSlideContent(
    { title: slideData.title, body: slideData.body, slideType, imageUrl: undefined },
    palette,
  );

  return frontmatter + '\n\n' + htmlContent;
}

// -- Main test runner --

async function runTests() {
  console.log('=== Marp Render Validation E2E Test ===\n');

  // Check marp-cli is available
  let marpCli;
  try {
    const mod = await import('@marp-team/marp-cli');
    marpCli = mod.marpCli;
  } catch (e) {
    console.error('marp-cli not found. Install: npm i @marp-team/marp-cli');
    process.exit(1);
  }

  const tempDir = join(ROOT, 'exports', `e2e-test-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const types = [...FIGMA_GRADE_TYPES];
  const results = [];
  let pass = 0;
  let fail = 0;

  for (const [themeName, palette] of Object.entries(PALETTES)) {
    console.log(`\n-- Theme: ${themeName} --`);

    for (const slideType of types) {
      const data = SLIDE_DATA[slideType];
      if (!data) {
        console.log(`  SKIP ${slideType} (no test data)`);
        continue;
      }

      const marpMd = generateMarpMarkdown(slideType, data, palette);
      const mdPath = join(tempDir, `${themeName}-${slideType}.md`);
      const imgBase = join(tempDir, `${themeName}-${slideType}`);

      await writeFile(mdPath, marpMd, 'utf-8');

      try {
        const exitCode = await marpCli([
          mdPath,
          '--images', 'jpeg',
          '--html',
          '--jpeg-quality', '80',
          '--allow-local-files',
          '--no-stdin',
          '-o', imgBase + '.jpeg',
        ]);

        if (exitCode !== 0) {
          console.log(`  FAIL ${slideType} -- Marp CLI exit code ${exitCode}`);
          fail++;
          results.push({ theme: themeName, type: slideType, pass: false, reason: `exit code ${exitCode}` });
          continue;
        }

        // Find rendered image (Marp outputs base.001.jpeg for single slide)
        const files = await readdir(tempDir);
        const imgFile = files.find(f =>
          f.startsWith(`${themeName}-${slideType}.`) && f.endsWith('.jpeg') && /\.\d{3}\.jpeg$/.test(f)
        );

        if (!imgFile) {
          console.log(`  FAIL ${slideType} -- No output JPEG found`);
          fail++;
          results.push({ theme: themeName, type: slideType, pass: false, reason: 'no output' });
          continue;
        }

        const buf = await readFile(join(tempDir, imgFile));
        const validation = validateJpeg(buf, slideType, themeName);

        if (validation.valid) {
          console.log(`  PASS ${slideType} -- ${(buf.length / 1024).toFixed(1)}KB ${validation.dims ? `${validation.dims.width}x${validation.dims.height}` : ''}`);
          pass++;
        } else {
          console.log(`  FAIL ${slideType} -- ${validation.issues.join(', ')}`);
          fail++;
        }

        results.push({
          theme: themeName,
          type: slideType,
          pass: validation.valid,
          size: buf.length,
          dims: validation.dims,
          issues: validation.issues,
        });

      } catch (err) {
        console.log(`  FAIL ${slideType} -- ${err.message}`);
        fail++;
        results.push({ theme: themeName, type: slideType, pass: false, reason: err.message });
      }
    }
  }

  // Cleanup
  for (const f of await readdir(tempDir)) {
    try { await unlink(join(tempDir, f)); } catch {}
  }
  try { await rmdir(tempDir); } catch {}

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`Total: ${pass + fail} | Pass: ${pass} | Fail: ${fail}`);

  if (fail > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ${r.theme} / ${r.type}: ${r.issues?.join(', ') || r.reason}`);
    }
    process.exit(1);
  }

  console.log('\nAll slides render correctly across all themes!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
