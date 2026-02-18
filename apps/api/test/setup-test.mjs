/**
 * Setup test credentials and test generation with curl (bypasses Node fetch timeout)
 */
const BASE = 'http://localhost:3000';

async function main() {
  // Login
  const login = await (await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' }),
  })).json();
  const jwt = login.tokens.accessToken;

  // Create API key
  const keyResult = await (await fetch(`${BASE}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ name: 'curl-test', scopes: ['presentations:read','presentations:write','generation','export'] }),
  })).json();
  const apiKey = keyResult.key;

  // Create Pitch Lens
  const lens = await (await fetch(`${BASE}/pitch-lens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      name: 'Test Lens',
      audienceType: 'TEAM',
      pitchGoal: 'EDUCATE',
      companyStage: 'ENTERPRISE',
      technicalLevel: 'SEMI_TECHNICAL',
      toneStyle: 'CONVERSATIONAL',
      industry: 'Technology',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT',
      imageFrequency: 2,
    }),
  })).json();

  console.log(JSON.stringify({ apiKey, lensId: lens.id }));
}
main().catch(e => console.error('ERROR:', e.message));
