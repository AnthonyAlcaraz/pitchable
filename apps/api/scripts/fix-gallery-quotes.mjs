#!/usr/bin/env node
/**
 * Fix stray quotes in gallery showcase presentation titles.
 * Replaces `—"` with `—` in all presentation titles.
 *
 * Uses pg directly to connect to the database.
 *
 * Usage:
 *   cd apps/api && node scripts/fix-gallery-quotes.mjs
 *   cd apps/api && DATABASE_URL=postgres://... node scripts/fix-gallery-quotes.mjs
 *   railway run -- node scripts/fix-gallery-quotes.mjs  (production)
 *
 * Flags:
 *   --dry-run   Preview changes without writing
 *   --api-only  Check via public gallery API (read-only, no DB needed)
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

const dryRun = process.argv.includes('--dry-run');
const apiOnly = process.argv.includes('--api-only');

const EM_DASH_QUOTE = '\u2014"'; // — followed by "

async function checkViaApi() {
  console.log('=== Fix Gallery Quotes (API check mode) ===\n');
  const res = await fetch('https://pitch-able.ai/gallery/presentations?limit=50');
  const data = await res.json();
  const items = data.items || [];
  const bad = items.filter(p => p.title && p.title.includes(EM_DASH_QUOTE));
  console.log(`Checked ${items.length} gallery presentations via public API.`);
  console.log(`Found ${bad.length} with stray quotes.\n`);
  if (bad.length > 0) {
    bad.forEach(p => console.log(`  BAD: [${p.id}] "${p.title}"`));
    console.log('\nTo fix, run with DATABASE_URL pointing to production DB.');
  } else {
    console.log('All titles are clean. Nothing to fix.');
  }
}

async function fixViaDb() {
  console.log('=== Fix Gallery Quotes ===\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not set. Provide it via .env or environment variable.');
    console.error('Tip: use --api-only to check via the public gallery API without DB access.');
    process.exit(1);
  }

  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString });
  await client.connect();

  try {
    // Find all presentations with titles containing —"
    const { rows: affected } = await client.query(
      `SELECT id, title FROM "Presentation" WHERE title LIKE $1`,
      [`%${EM_DASH_QUOTE}%`]
    );

    console.log(`Found ${affected.length} presentation(s) with stray quotes in titles.\n`);

    if (affected.length === 0) {
      console.log('Nothing to fix. All titles are clean.');
      return;
    }

    if (dryRun) {
      console.log('[DRY RUN] Would fix:\n');
    }

    for (const p of affected) {
      const newTitle = p.title.replace(/\u2014"/g, '\u2014');
      if (dryRun) {
        console.log(`  "${p.title}" -> "${newTitle}"`);
      } else {
        await client.query(
          `UPDATE "Presentation" SET title = $1 WHERE id = $2`,
          [newTitle, p.id]
        );
        console.log(`Fixed: "${p.title}" -> "${newTitle}"`);
      }
    }

    console.log(`\nDone. ${dryRun ? 'Would update' : 'Updated'} ${affected.length} presentation(s).`);
  } finally {
    await client.end();
  }
}

(apiOnly ? checkViaApi() : fixViaDb()).catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
