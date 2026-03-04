#!/usr/bin/env node
/**
 * Merge content sets and POST to production seed endpoint.
 * Usage: node scripts/call-seed.mjs
 */

import { CONTENT_A, CONTENT_B, CONTENT_C, CONTENT_D } from './base-showcase-content.mjs';
import { EXTRA_CONTENT_A, EXTRA_CONTENT_B, EXTRA_CONTENT_C, EXTRA_CONTENT_D } from './extra-showcase-content.mjs';

const payload = {
  A: { ...CONTENT_A, ...EXTRA_CONTENT_A },
  B: { ...CONTENT_B, ...EXTRA_CONTENT_B },
  C: { ...CONTENT_C, ...EXTRA_CONTENT_C },
  D: { ...CONTENT_D, ...EXTRA_CONTENT_D },
};

console.log(`Content sets: ${Object.keys(payload).join(', ')}`);
for (const [k, v] of Object.entries(payload)) {
  console.log(`  ${k}: ${Object.keys(v).length} slide types`);
}

const API_URL = 'https://pitch-able.ai/gallery/seed';

console.log(`\nPOSTing to ${API_URL}...`);
const res = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Failed: ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(1);
}

const result = await res.json();
console.log('\nSeed result:');
console.log(JSON.stringify(result, null, 2));

// Trigger preview generation sequentially with delay to avoid overloading Puppeteer
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (result.created?.length) {
  console.log(`\nTriggering preview generation for ${result.created.length} presentations (sequential, 15s delay)...`);
  for (let i = 0; i < result.created.length; i++) {
    const p = result.created[i];
    try {
      const previewRes = await fetch(`https://pitch-able.ai/presentations/${p.id}/generate-previews`, {
        method: 'POST',
      });
      console.log(`  [${i + 1}/${result.created.length}] ${p.title}: ${previewRes.status}`);
    } catch (err) {
      console.log(`  [${i + 1}/${result.created.length}] ${p.title}: FAILED - ${err.message}`);
    }
    // Wait 15s between presentations to let Puppeteer finish rendering
    if (i < result.created.length - 1) {
      console.log(`  ... waiting 15s before next ...`);
      await sleep(15000);
    }
  }

  // Verify previews after all generation completes
  console.log('\n--- Waiting 30s for final renders to complete ---');
  await sleep(30000);
  console.log('\nVerifying preview availability...');
  let working = 0;
  for (const p of result.created) {
    try {
      // Get first slide ID
      const presRes = await fetch(`https://pitch-able.ai/gallery/presentations/${p.id}`);
      const presData = await presRes.json();
      const firstSlide = presData.slides?.[0];
      if (!firstSlide) {
        console.log(`  ${p.title.slice(0, 40)}: NO SLIDES`);
        continue;
      }
      const prevRes = await fetch(`https://pitch-able.ai/slides/${firstSlide.id}/preview`);
      const status = prevRes.status === 302 || prevRes.status === 200 ? 'OK' : `MISSING (${prevRes.status})`;
      if (prevRes.status === 302 || prevRes.status === 200) working++;
      console.log(`  ${p.title.slice(0, 40)}: ${status}`);
    } catch (err) {
      console.log(`  ${p.title.slice(0, 40)}: ERROR - ${err.message}`);
    }
  }
  console.log(`\n${working}/${result.created.length} presentations have working previews.`);
}
