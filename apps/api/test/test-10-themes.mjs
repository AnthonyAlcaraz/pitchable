/**
 * test-10-themes.mjs
 *
 * Test 10 different themes with "GenAI Trends 2026" topic.
 * Uses fire-and-poll pattern to avoid HTTP timeout issues with long Opus generation.
 *
 * Strategy:
 * 1. Fire generation request via node:http (no fetch timeout)
 * 2. Poll presentations API for status change (PROCESSING -> COMPLETED/FAILED)
 * 3. Validate results including slide count, image prompts, exports
 *
 * Usage: node test/test-10-themes.mjs
 */
import http from 'node:http';

const BASE = 'http://localhost:3000';

// 10 themes to test (diverse mix of categories)
const THEMES = [
  { name: 'pitchable-dark',       id: '510a29a7-8344-4a1d-9b1e-3213db68f053', category: 'dark' },
  { name: 'mckinsey-executive',   id: 'd4cf8da3-2654-4e5c-85f7-f09292d1b2a0', category: 'consulting' },
  { name: 'apple-keynote',        id: '3c0be2a6-27fc-4460-9ad1-4627e5a83890', category: 'dark' },
  { name: 'z4-dark-premium',      id: 'e93ab9e2-3431-4e0a-b154-1492feb5730a', category: 'dark' },
  { name: 'ted-talk',             id: '9bf5ee10-9e0f-444b-979d-22ce77cb344c', category: 'dark' },
  { name: 'stripe-fintech',       id: '2785c973-fee8-456b-9b30-ae36b8533c6d', category: 'dark' },
  { name: 'yc-startup',           id: '578e3902-b46d-4eb9-9e1b-7807c986c91b', category: 'light' },
  { name: 'airbnb-story',         id: '5bf71c74-dd01-4e0f-83da-197eb6b74cb2', category: 'creative' },
  { name: 'bcg-strategy',         id: '0e4ed3d5-a2a5-4e90-9c10-b8a94d145cc8', category: 'consulting' },
  { name: 'creative-warm',        id: 'c34fa083-5427-471f-b29d-f51982e9624f', category: 'creative' },
];

const TOPIC = 'GenAI Trends 2026: LLMs, Agents, and Enterprise Applications in Retail & Gaming';

function httpRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 900_000, // 15 min socket timeout
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode} ${path}: ${data.slice(0, 300)}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout on ${path}`)); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function pollPresentationStatus(apiKey, presentationId, maxWaitMs = 900_000) {
  const start = Date.now();
  const pollInterval = 10_000; // 10s

  while (Date.now() - start < maxWaitMs) {
    try {
      const pres = await httpRequest(`/api/v1/presentations/${presentationId}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (pres.status === 'COMPLETED') return pres;
      if (pres.status === 'FAILED') throw new Error('Presentation generation FAILED in DB');

      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const slideCount = pres.slides?.length ?? 0;
      process.stdout.write(`\r  Polling... ${elapsed}s (${slideCount} slides so far, status: ${pres.status})`);
    } catch (pollErr) {
      // Presentation might not be readable yet (still PROCESSING), that's OK
      if (!pollErr.message.includes('FAILED')) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        process.stdout.write(`\r  Polling... ${elapsed}s (waiting...)`);
      } else {
        throw pollErr;
      }
    }
    await sleep(pollInterval);
  }

  throw new Error(`Timed out after ${maxWaitMs / 1000}s waiting for presentation`);
}

async function main() {
  console.log('=== Pitchable 10-Theme Test Suite ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Step 1: Login
  console.log('[1/3] Authenticating...');
  let jwt;
  try {
    const reg = await httpRequest('/auth/register', {
      method: 'POST',
      body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!', name: 'Theme Tester' },
    });
    jwt = reg.tokens.accessToken;
    console.log('  Registered new user');
  } catch {
    const login = await httpRequest('/auth/login', {
      method: 'POST',
      body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
    });
    jwt = login.tokens.accessToken;
    console.log('  Logged in existing user');
  }

  const authHeaders = { Authorization: `Bearer ${jwt}` };

  // Step 2: Create API key
  console.log('[2/3] Creating API key...');
  let apiKey;
  try {
    const keyResult = await httpRequest('/api-keys', {
      method: 'POST',
      headers: authHeaders,
      body: { name: `theme-test-${Date.now()}`, scopes: ['presentations:read', 'presentations:write', 'generation', 'export'] },
    });
    apiKey = keyResult.key;
    console.log(`  API key: ${apiKey.slice(0, 12)}...`);
  } catch (e) {
    console.error(`  API key creation failed: ${e.message}`);
    process.exit(1);
  }

  // Step 3: Check & add credits
  console.log('  Checking credits...');
  const balance = await httpRequest('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
  console.log(`  Current balance: ${balance.balance} credits`);

  if (balance.balance < 30) {
    console.log('  Adding 500 credits...');
    await httpRequest('/credits/purchase', {
      method: 'POST',
      headers: authHeaders,
      body: { amount: 500 },
    });
    const newBal = await httpRequest('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
    console.log(`  New balance: ${newBal.balance} credits`);
  }

  // Step 4: Create Pitch Lens
  console.log('[3/3] Creating Pitch Lens...');
  const lens = await httpRequest('/pitch-lens', {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: 'GenAI Theme Test',
      audienceType: 'TEAM',
      pitchGoal: 'EDUCATE',
      companyStage: 'ENTERPRISE',
      technicalLevel: 'SEMI_TECHNICAL',
      toneStyle: 'CONVERSATIONAL',
      industry: 'Technology',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT',
      imageFrequency: 2,
    },
  });
  console.log(`  Pitch Lens: ${lens.id}\n`);

  // Step 5: Generate decks for each theme
  const results = [];
  for (let i = 0; i < THEMES.length; i++) {
    const theme = THEMES[i];
    if (i > 0) {
      console.log('  (waiting 5s between decks...)');
      await sleep(5000);
    }
    console.log(`\n[${i + 1}/${THEMES.length}] Generating: ${theme.name} (${theme.category})`);
    console.log(`  Theme ID: ${theme.id}`);

    const startTime = Date.now();
    try {
      // Fire the generation request - use the long-timeout http client
      const deck = await httpRequest('/api/v1/generate', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: {
          topic: TOPIC,
          presentationType: 'STANDARD',
          themeId: theme.id,
          pitchLensId: lens.id,
        },
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const slideCount = deck.slides?.length ?? 0;
      const imagesScheduled = deck.slides?.filter(s => s.imagePrompt).length ?? 0;

      console.log(`\n  SUCCESS: ${slideCount} slides, ${imagesScheduled} images queued, ${elapsed}s`);

      // Quality check
      const titles = deck.slides?.map(s => s.title) ?? [];
      const genericTitles = titles.filter(t =>
        /^(overview|introduction|summary|agenda|conclusion)$/i.test(t.trim())
      );
      if (genericTitles.length > 0) {
        console.log(`  WARNING: Generic titles: ${genericTitles.join(', ')}`);
      }

      // Check image prompts
      const bgImages = deck.slides?.filter(s => s.imagePrompt && s.body?.includes('background')).length ?? 0;
      console.log(`  Image prompts: ${imagesScheduled} total`);
      console.log(`  Slide titles: ${titles.join(' | ')}`);

      results.push({
        theme: theme.name,
        category: theme.category,
        status: 'OK',
        slides: slideCount,
        images: imagesScheduled,
        time: elapsed,
        presentationId: deck.id,
      });

      // Export PDF
      try {
        const pdf = await httpRequest(`/api/v1/presentations/${deck.id}/export`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { format: 'PDF' },
        });
        console.log(`  PDF: ${pdf.status}`);
        results[results.length - 1].pdfExport = pdf.status;
      } catch (e) {
        console.log(`  PDF: FAILED - ${e.message.slice(0, 100)}`);
        results[results.length - 1].pdfExport = 'FAILED';
      }

      // Export PPTX
      try {
        const pptx = await httpRequest(`/api/v1/presentations/${deck.id}/export`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { format: 'PPTX' },
        });
        console.log(`  PPTX: ${pptx.status}`);
        results[results.length - 1].pptxExport = pptx.status;
      } catch (e) {
        console.log(`  PPTX: FAILED - ${e.message.slice(0, 100)}`);
        results[results.length - 1].pptxExport = 'FAILED';
      }

      // Email PDF to user
      try {
        const emailResult = await httpRequest(`/api/v1/presentations/${deck.id}/email`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { format: 'PDF', email: 'alcarazanthony1@gmail.com' },
        });
        console.log(`  Email: ${emailResult.sent ? 'SENT to ' + emailResult.to : 'FAILED - ' + emailResult.error}`);
        results[results.length - 1].emailSent = emailResult.sent;
      } catch (e) {
        console.log(`  Email: FAILED - ${e.message.slice(0, 100)}`);
        results[results.length - 1].emailSent = false;
      }

    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // If HTTP timed out, try polling for the presentation
      if (err.message.includes('Timeout') || err.message.includes('socket hang up')) {
        console.log(`\n  HTTP connection dropped at ${elapsed}s — polling DB for result...`);
        try {
          // List recent presentations to find the one being generated
          const presentations = await httpRequest('/api/v1/presentations', {
            headers: { 'x-api-key': apiKey },
          });
          const processing = presentations.find(p => p.status === 'PROCESSING' && p.themeId === theme.id);
          if (processing) {
            const finalDeck = await pollPresentationStatus(apiKey, processing.id, 600_000);
            const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const slideCount = finalDeck.slides?.length ?? 0;
            const imagesScheduled = finalDeck.slides?.filter(s => s.imagePrompt).length ?? 0;
            console.log(`\n  SUCCESS (via poll): ${slideCount} slides, ${imagesScheduled} images, ${totalElapsed}s`);
            results.push({
              theme: theme.name, category: theme.category, status: 'OK',
              slides: slideCount, images: imagesScheduled, time: totalElapsed,
              presentationId: finalDeck.id, note: 'polled',
            });
            continue;
          }
        } catch (pollErr) {
          console.log(`  Poll failed: ${pollErr.message.slice(0, 100)}`);
        }
      }

      console.log(`  FAILED: ${err.message.slice(0, 200)} (${elapsed}s)`);
      results.push({
        theme: theme.name, category: theme.category, status: 'FAILED',
        error: err.message.slice(0, 100), time: elapsed,
      });
    }
  }

  // Summary
  console.log('\n\n=== RESULTS SUMMARY ===\n');
  console.log('Theme                  | Category   | Status | Slides | Images | PDF     | PPTX    | Email | Time');
  console.log('-'.repeat(110));
  for (const r of results) {
    const line = [
      r.theme.padEnd(22),
      (r.category || '').padEnd(10),
      (r.status || '').padEnd(6),
      String(r.slides ?? '-').padEnd(6),
      String(r.images ?? '-').padEnd(6),
      (r.pdfExport ?? '-').padEnd(7),
      (r.pptxExport ?? '-').padEnd(7),
      (r.emailSent ? 'YES' : r.emailSent === false ? 'NO' : '-').padEnd(5),
      `${r.time}s`,
    ].join(' | ');
    console.log(line);
  }

  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length}`);

  if (failed > 0) {
    console.log('\nFailed themes:');
    for (const r of results.filter(r => r.status === 'FAILED')) {
      console.log(`  - ${r.theme}: ${r.error}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
