/**
 * publish-showcase.mjs — Mark showcase decks as public + featured.
 *
 * Finds the most recent completed presentations from the test user,
 * publishes them, and sets the featured flag.
 *
 * Usage: node test/publish-showcase.mjs [count=6]
 */
import http from 'node:http';
import pg from 'pg';

const BASE = 'http://localhost:3000';
const AUTH_CREDS = { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' };
const DB_URL = process.env.DATABASE_URL || 'postgresql://deckpilot:deckpilot_dev@localhost:5432/deckpilot';
const COUNT = parseInt(process.argv[2] || '6', 10);

function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        else { try { resolve(JSON.parse(data)); } catch { resolve(data); } }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function main() {
  console.log(`\n=== Publishing ${COUNT} showcase decks as public + featured ===\n`);

  // 1. Login
  const login = await httpReq('/auth/login', { method: 'POST', body: AUTH_CREDS });
  const jwt = login.tokens.accessToken;
  const userId = login.user.id;
  console.log(`Logged in as ${login.user.email} (${userId})`);

  // 2. Get recent completed presentations via API
  const presentations = await httpReq('/presentations', {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const all = Array.isArray(presentations) ? presentations : presentations.data || [];
  const completed = all
    .filter(p => p.status === 'COMPLETED')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, COUNT);

  if (completed.length === 0) {
    console.log('No completed presentations found. Run showcase-6-decks.mjs first.');
    process.exit(1);
  }

  console.log(`Found ${completed.length} completed presentations:\n`);

  // 3. Publish each via API (sequential with delay to avoid rate limiting)
  for (const pres of completed) {
    try {
      await httpReq(`/presentations/${pres.id}/visibility`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
        body: { isPublic: true },
      });
      console.log(`  [PUBLIC] ${pres.title.slice(0, 60)}`);
      await new Promise(r => setTimeout(r, 1000)); // 1s delay to avoid 429
    } catch (err) {
      console.log(`  [FAIL]   ${pres.title.slice(0, 60)} — ${err.message.slice(0, 100)}`);
    }
  }

  // 4. Set featured flag via direct DB (no API endpoint for this yet)
  const { Client } = pg;
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // First, clear any existing featured flags
  await client.query(`UPDATE "Presentation" SET featured = false WHERE featured = true`);
  console.log('\n  [DB] Cleared existing featured flags');

  // Set featured + isPublic + publishedAt on our showcase decks (DB fallback for any 429s)
  const ids = completed.map(p => p.id);
  const result = await client.query(
    `UPDATE "Presentation" SET featured = true, "isPublic" = true, "publishedAt" = COALESCE("publishedAt", NOW()) WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  console.log(`  [DB] Set featured=true, isPublic=true on ${result.rowCount} presentations`);

  await client.end();

  // 5. Verify via gallery API
  console.log('\n=== Verification ===');
  const gallery = await httpReq('/gallery/presentations?limit=10&sort=recent');
  const featured = (gallery.items || gallery.data || []).filter(p => p.featured);
  console.log(`Gallery returns ${featured.length} featured presentations:`);
  for (const p of featured) {
    console.log(`  * ${p.title.slice(0, 60)} [${p.presentationType}]`);
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
