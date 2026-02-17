import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://deckpilot:deckpilot_dev@localhost:5432/deckpilot' });
await client.connect();

// List all users
const allUsers = await client.query(`SELECT id, email, "failedLoginAttempts", "lockedUntil" FROM "User" LIMIT 10`);
console.log('All users:');
for (const u of allUsers.rows) {
  console.log(` - ${u.email} | attempts=${u.failedLoginAttempts} | locked=${u.lockedUntil || 'no'}`);
}

// Reset any locked user
for (const u of allUsers.rows) {
  if (u.lockedUntil || u.failedLoginAttempts > 0) {
    await client.query(`UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE id = $1`, [u.id]);
    console.log(`RESET: Cleared lockout for ${u.email}`);
  }
}

await client.end();
