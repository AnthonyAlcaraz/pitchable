import http from 'node:http';

function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

const login = await httpReq('/auth/login', {
  method: 'POST',
  body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
});
const jwt = login.tokens.accessToken;

const lenses = await httpReq('/pitch-lens', {
  headers: { Authorization: `Bearer ${jwt}` },
});

for (const l of lenses) {
  console.log(l.id, l.name, 'imageFrequency:', l.imageFrequency);
}
