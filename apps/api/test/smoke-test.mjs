/**
 * smoke-test.mjs — Quick E2E test: login, create lens, generate 1 deck, export, email.
 * Validates the full pipeline before running the 6-deck overnight batch.
 */
import http from 'node:http';

const BASE = 'http://localhost:3000';

function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      timeout: 900_000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        else { try { resolve(JSON.parse(data)); } catch { resolve(data); } }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function main() {
  const t0 = Date.now();
  console.log('Smoke test started:', new Date().toISOString());

  // Login
  const login = await httpReq('/auth/login', {
    method: 'POST',
    body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
  });
  const jwt = login.tokens.accessToken;
  console.log('[1/7] Login OK');

  // API key
  const key = await httpReq('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: { name: `smoke-${Date.now()}`, scopes: ['presentations:read', 'presentations:write', 'generation', 'export'] },
  });
  const apiKey = key.key;
  console.log('[2/7] API key OK');

  // Credits
  const bal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
  console.log(`[3/7] Credits: ${bal.balance}`);
  if (bal.balance < 10) {
    await httpReq('/credits/purchase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: { amount: 100 },
    });
    console.log('      Topped up credits');
  }

  // Create lens
  const lens = await httpReq('/pitch-lens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: 'Smoke Test Lens',
      audienceType: 'TEAM',
      pitchGoal: 'EDUCATE',
      industry: 'Technology',
      companyStage: 'ENTERPRISE',
      toneStyle: 'CONVERSATIONAL',
      technicalLevel: 'SEMI_TECHNICAL',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT',
      imageFrequency: 1,
    },
  });
  console.log(`[4/7] Lens created: ${lens.id}`);

  // List existing lenses
  const lenses = await httpReq('/api/v1/lenses', { headers: { 'x-api-key': apiKey } });
  console.log(`      Existing lenses: ${lenses.length}`);

  // Generate
  console.log('[5/7] Generating deck...');
  const timer = setInterval(() => {
    process.stdout.write(`      ${((Date.now() - t0) / 1000).toFixed(0)}s...\r`);
  }, 10_000);

  const deck = await httpReq('/api/v1/generate', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: {
      topic: 'Quick smoke test: AI-Powered Presentation Tools',
      presentationType: 'STANDARD',
      themeId: '510a29a7-8344-4a1d-9b1e-3213db68f053', // pitchable-dark
      pitchLensId: lens.id,
    },
  });
  clearInterval(timer);
  console.log(`[5/7] Generated: ${deck.slides?.length} slides in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  deck.slides?.forEach((s, i) => console.log(`      ${i+1}. [${s.slideType}] ${s.title}`));

  // Export PDF
  const pdf = await httpReq(`/api/v1/presentations/${deck.id}/export`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { format: 'PDF' },
  });
  console.log(`[6/7] PDF export: ${pdf.status}`);

  // Email
  const email = await httpReq(`/api/v1/presentations/${deck.id}/email`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { email: 'alcarazanthony1@gmail.com', format: 'PDF' },
  });
  console.log(`[7/7] Email: ${email.sent ? 'SENT' : 'FAILED'}`);

  const total = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nSmoke test PASSED in ${total}s`);
}

main().catch(e => {
  console.error('SMOKE TEST FAILED:', e.message);
  process.exit(1);
});
