import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: 'postgresql://deckpilot:deckpilot_dev@localhost:5432/deckpilot' });
await client.connect();

const tables = [
  ['Users', '"User"'],
  ['Presentations', '"Presentation"'],
  ['Slides', '"Slide"'],
  ['Subscriptions', '"Subscription"'],
  ['ExportJobs', '"ExportJob"'],
  ['CreditTransactions', '"CreditTransaction"'],
  ['FeedbackEntries', '"FeedbackEntry"'],
  ['ChatMessages', '"ChatMessage"'],
  ['ApiKeys', '"ApiKey"'],
  ['PresentationViews', '"PresentationView"'],
  ['GenerationMetrics', '"GenerationMetric"'],
  ['GenerationRatings', '"GenerationRating"'],
  ['ActivityEvents', '"ActivityEvent"'],
  ['ImageJobs', '"ImageJob"'],
  ['Documents', '"Document"'],
  ['DocumentChunks', '"DocumentChunk"'],
  ['PitchLenses', '"PitchLens"'],
  ['PitchBriefs', '"PitchBrief"'],
  ['DraftSlides', '"DraftSlide"'],
  ['ImagePool', '"ImagePool"'],
  ['ImageUsage', '"ImageUsage"'],
];

console.log('=== RECORD COUNTS ===');
for (const [label, table] of tables) {
  try {
    const r = await client.query(`SELECT count(*) FROM ${table}`);
    console.log(`${label}: ${r.rows[0].count}`);
  } catch (e) { /* table may not exist */ }
}

// Recent users
console.log('\n=== RECENT USERS ===');
const users = await client.query(`SELECT email, name, plan, "createdAt", "emailVerified", "authProvider" FROM "User" ORDER BY "createdAt" DESC LIMIT 15`);
users.rows.forEach(u => console.log(`${u.createdAt.toISOString().slice(0,10)} | ${u.email} | ${u.name || '-'} | ${u.plan} | verified:${u.emailVerified} | ${u.authProvider}`));

// Subscriptions
console.log('\n=== SUBSCRIPTIONS ===');
const subs = await client.query(`SELECT s.plan, s.status, s."createdAt", s."stripeSubscriptionId", u.email FROM "Subscription" s JOIN "User" u ON s."userId" = u.id ORDER BY s."createdAt" DESC`);
subs.rows.forEach(s => console.log(`${s.createdAt.toISOString().slice(0,10)} | ${s.email} | ${s.plan} | ${s.status} | stripe:${s.stripeSubscriptionId || 'none'}`));

// Recent activity
console.log('\n=== RECENT ACTIVITY (last 25) ===');
try {
  const act = await client.query(`SELECT "eventType", category, "createdAt", "userId" FROM "ActivityEvent" ORDER BY "createdAt" DESC LIMIT 25`);
  act.rows.forEach(a => console.log(`${a.createdAt.toISOString().slice(0,16)} | ${a.eventType} | ${a.category} | user:${(a.userId||'anon').slice(0,8)}`));
} catch(e) { console.log('No activity events table'); }

// Recent presentations
console.log('\n=== RECENT PRESENTATIONS ===');
const pres = await client.query(`SELECT p.title, p."createdAt", p.status, u.email, (SELECT count(*) FROM "Slide" s WHERE s."presentationId" = p.id) as slide_count FROM "Presentation" p JOIN "User" u ON p."userId" = u.id ORDER BY p."createdAt" DESC LIMIT 10`);
pres.rows.forEach(pr => console.log(`${pr.createdAt.toISOString().slice(0,10)} | ${(pr.title||'untitled').slice(0,50)} | ${pr.slide_count} slides | ${pr.status} | ${pr.email}`));

// Recent exports
console.log('\n=== RECENT EXPORTS ===');
const exp = await client.query(`SELECT format, status, "createdAt" FROM "ExportJob" ORDER BY "createdAt" DESC LIMIT 10`);
exp.rows.forEach(e => console.log(`${e.createdAt.toISOString().slice(0,16)} | ${e.format} | ${e.status}`));

// Generation metrics summary
console.log('\n=== GENERATION METRICS (last 10) ===');
try {
  const gm = await client.query(`SELECT model, operation, "inputTokens", "outputTokens", "durationMs", success, "createdAt" FROM "GenerationMetric" ORDER BY "createdAt" DESC LIMIT 10`);
  gm.rows.forEach(m => console.log(`${m.createdAt.toISOString().slice(0,16)} | ${m.model} | ${m.operation} | ${m.inputTokens}+${m.outputTokens} tok | ${m.durationMs}ms | ok:${m.success}`));
} catch(e) { console.log('No generation metrics'); }

// Credit usage summary
console.log('\n=== CREDIT SUMMARY BY USER ===');
const credits = await client.query(`SELECT u.email, u.plan, u."creditBalance", (SELECT count(*) FROM "Presentation" p WHERE p."userId" = u.id) as decks, (SELECT count(*) FROM "CreditTransaction" ct WHERE ct."userId" = u.id) as transactions FROM "User" u ORDER BY u."createdAt" DESC LIMIT 15`);
credits.rows.forEach(c => console.log(`${c.email} | ${c.plan} | balance:${c.creditBalance} | decks:${c.decks} | txns:${c.transactions}`));

// User stats summary
console.log('\n=== SUMMARY ===');
const totalUsers = await client.query(`SELECT count(*) as total, count(*) FILTER (WHERE "emailVerified" = true) as verified, count(*) FILTER (WHERE "authProvider" = 'google') as google FROM "User"`);
const r = totalUsers.rows[0];
console.log(`Total users: ${r.total} | Verified: ${r.verified} | Google auth: ${r.google}`);

const today = await client.query(`SELECT count(*) FROM "User" WHERE "createdAt" > NOW() - INTERVAL '24 hours'`);
const week = await client.query(`SELECT count(*) FROM "User" WHERE "createdAt" > NOW() - INTERVAL '7 days'`);
console.log(`Signups last 24h: ${today.rows[0].count} | Last 7d: ${week.rows[0].count}`);

await client.end();
