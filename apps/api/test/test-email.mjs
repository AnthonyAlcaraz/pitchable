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

const login = await httpReq('/auth/login', {
  method: 'POST',
  body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
});
const jwt = login.tokens.accessToken;

// Create API key
const keyResult = await httpReq('/api-keys', {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}` },
  body: { name: `email-test-${Date.now()}`, scopes: ['presentations:read','presentations:write','generation','export'] },
});
const apiKey = keyResult.key;

// Get latest presentation
const presentations = await httpReq('/api/v1/presentations', {
  headers: { 'x-api-key': apiKey },
});

const completed = presentations.filter(p => p.status === 'COMPLETED');
console.log(`Found ${completed.length} completed presentations`);

if (completed.length > 0) {
  const pres = completed[0];
  console.log(`Emailing: "${pres.title}" (${pres.id})`);

  const result = await httpReq(`/api/v1/presentations/${pres.id}/email`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: { format: 'PDF', email: 'alcarazanthony1@gmail.com' },
  });

  console.log('Email result:', JSON.stringify(result));
}
