/**
 * email-all.mjs — Email all completed presentations without regenerating.
 * Usage: node test/email-all.mjs
 */
import http from 'node:http';

function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      timeout: 300_000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data.slice(0, 400)}`));
        else { try { resolve(JSON.parse(data)); } catch { resolve(data); } }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

const EMAIL = 'alcarazanthony1@gmail.com';

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
  body: { name: `email-all-${Date.now()}`, scopes: ['presentations:read', 'presentations:write', 'generation', 'export'] },
});
const apiKey = keyResult.key;
console.log(`API key: ${apiKey.slice(0, 12)}...`);

// List all presentations
const presentations = await httpReq('/api/v1/presentations', {
  headers: { 'x-api-key': apiKey },
});

const completed = presentations.filter(p => p.status === 'COMPLETED');
console.log(`\nFound ${completed.length} completed presentations\n`);

let sent = 0;
let failed = 0;

for (const pres of completed) {
  const slideCount = pres.slides?.length ?? '?';
  const themeName = pres.theme?.displayName || pres.theme?.name || 'unknown';
  console.log(`[${sent + failed + 1}/${completed.length}] "${pres.title}" (${slideCount} slides, theme: ${themeName})`);

  try {
    const result = await httpReq(`/api/v1/presentations/${pres.id}/email`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: { format: 'PDF', email: EMAIL },
    });

    if (result.sent) {
      console.log(`  -> SENT to ${result.to}`);
      sent++;
    } else {
      console.log(`  -> FAILED: ${result.error}`);
      failed++;
    }
  } catch (e) {
    console.log(`  -> ERROR: ${e.message.slice(0, 150)}`);
    failed++;
  }

  // Small delay between emails to avoid rate limiting
  await new Promise(r => setTimeout(r, 2000));
}

console.log(`\n=== Done: ${sent} sent, ${failed} failed out of ${completed.length} ===`);
