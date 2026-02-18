/**
 * Quick single-theme test using node:http (no fetch timeout issues).
 * Tests mckinsey-executive with full quality pipeline.
 */
import http from 'node:http';

const BASE = 'http://localhost:3000';

function httpReq(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 900_000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data.slice(0, 400)}`));
        else { try { resolve(JSON.parse(data)); } catch { resolve(data); } }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Socket timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('Single-theme test (node:http, 15min timeout)');
  console.log('Time:', new Date().toISOString());

  // Login
  const login = await httpReq('/auth/login', {
    method: 'POST',
    body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
  });
  const jwt = login.tokens.accessToken;
  console.log('Logged in');

  // Create API key
  const keyResult = await httpReq('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: { name: `single-${Date.now()}`, scopes: ['presentations:read','presentations:write','generation','export'] },
  });
  const apiKey = keyResult.key;
  console.log('API key:', apiKey.slice(0, 12));

  // Check credits
  const bal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
  console.log('Credits:', bal.balance);

  if (bal.balance < 3) {
    console.log('Adding credits...');
    await httpReq('/credits/purchase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: { amount: 100 },
    });
    const newBal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
    console.log('New balance:', newBal.balance);
  }

  // Create lens
  const lens = await httpReq('/pitch-lens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: 'Single Test', audienceType: 'TEAM', pitchGoal: 'EDUCATE',
      companyStage: 'ENTERPRISE', technicalLevel: 'SEMI_TECHNICAL',
      toneStyle: 'CONVERSATIONAL', industry: 'Technology',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT', imageFrequency: 2,
    },
  });
  console.log('Lens:', lens.id);

  // Generate
  console.log('\nGenerating mckinsey-executive deck...');
  const start = Date.now();

  // Log progress every 30s
  const progressTimer = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`  ... ${elapsed}s elapsed\n`);
  }, 30_000);

  try {
    const deck = await httpReq('/api/v1/generate', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: {
        topic: 'GenAI Trends 2026: LLMs, Agents, and Enterprise Applications',
        presentationType: 'STANDARD',
        themeId: 'd4cf8da3-2654-4e5c-85f7-f09292d1b2a0',
        pitchLensId: lens.id,
      },
    });

    clearInterval(progressTimer);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nSUCCESS in ${elapsed}s`);
    console.log('Slides:', deck.slides?.length);
    console.log('Image prompts:', deck.slides?.filter(s => s.imagePrompt).length);
    console.log('Titles:', deck.slides?.map(s => s.title).join(' | '));

    // Export PDF
    console.log('\nExporting PDF...');
    try {
      const pdf = await httpReq(`/api/v1/presentations/${deck.id}/export`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: { format: 'PDF' },
      });
      console.log('PDF:', pdf.status);
    } catch (e) {
      console.log('PDF failed:', e.message.slice(0, 200));
    }

  } catch (err) {
    clearInterval(progressTimer);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nFAILED after ${elapsed}s: ${err.message.slice(0, 500)}`);
  }
}

main().catch(e => console.error('FATAL:', e.message));
