/**
 * Quick single-theme test to verify end-to-end generation pipeline.
 */
const BASE = 'http://localhost:3000';

async function api(path, opts = {}) {
  const url = `${BASE}${path}`;
  const { headers: extraHeaders, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 600_000);
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('Single-theme test: mckinsey-executive');
  console.log('Time:', new Date().toISOString());

  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' }),
  });
  const jwt = login.tokens.accessToken;

  const keyResult = await api('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ name: 'single-test', scopes: ['presentations:read','presentations:write','generation','export'] }),
  });
  const apiKey = keyResult.key;
  console.log('API key:', apiKey.slice(0, 12));

  const lens = await api('/pitch-lens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      name: 'Single Theme Test',
      audienceType: 'TEAM',
      pitchGoal: 'EDUCATE',
      companyStage: 'ENTERPRISE',
      technicalLevel: 'SEMI_TECHNICAL',
      toneStyle: 'CONVERSATIONAL',
      industry: 'Technology',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT',
      imageFrequency: 2,
    }),
  });
  console.log('Lens:', lens.id);

  console.log('\nGenerating mckinsey-executive deck...');
  const start = Date.now();

  const deck = await api('/api/v1/generate', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: JSON.stringify({
      topic: 'GenAI Trends 2026: LLMs, Agents, and Enterprise Applications',
      presentationType: 'STANDARD',
      themeId: 'd4cf8da3-2654-4e5c-85f7-f09292d1b2a0',
      pitchLensId: lens.id,
    }),
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nSUCCESS in ${elapsed}s`);
  console.log('Slides:', deck.slides?.length);
  console.log('Images scheduled:', deck.slides?.filter(s => s.imagePrompt).length);
  console.log('Titles:', deck.slides?.map(s => s.title).join(' | '));

  // Export PDF
  console.log('\nExporting PDF...');
  try {
    const pdf = await api(`/api/v1/presentations/${deck.id}/export`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: JSON.stringify({ format: 'PDF' }),
    });
    console.log('PDF:', pdf.status);
  } catch (e) {
    console.log('PDF failed:', e.message.slice(0, 200));
  }

  // Export PPTX
  console.log('Exporting PPTX...');
  try {
    const pptx = await api(`/api/v1/presentations/${deck.id}/export`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: JSON.stringify({ format: 'PPTX' }),
    });
    console.log('PPTX:', pptx.status);
  } catch (e) {
    console.log('PPTX failed:', e.message.slice(0, 200));
  }
}

main().catch(e => console.error('FATAL:', e.message));
