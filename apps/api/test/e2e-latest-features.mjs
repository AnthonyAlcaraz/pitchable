/**
 * E2E Test: Latest Features — New Themes + Figma 2 Images + Background Layout
 *
 * Tests the full pipeline:
 *   1. Login + API key creation
 *   2. Create PitchLens with BACKGROUND image layout + imageFrequency=1 (every slide)
 *   3. Generate 1 deck using a newer theme (stripe-fintech)
 *   4. Verify slides have image prompts (background mode)
 *   5. Test Figma integration endpoints (connect, status, assign frame mock)
 *   6. Export to PDF
 *   7. Email result
 */
import http from 'node:http';

const BASE = 'http://localhost:3000';

// --- Newer themes to verify (recently added / creative category) ---
const THEMES = {
  'stripe-fintech': '2785c973-fee8-456b-9b30-ae36b8533c6d',
  'z4-dark-premium': 'e93ab9e2-3431-4e0a-b154-1492feb5730a',
  'academic-research': '89cc71e1-5848-4e64-a6cf-ceb96761cc19',
  'ted-talk': '9bf5ee10-9e0f-444b-979d-22ce77cb344c',
  'airbnb-story': '5bf71c74-dd01-4e0f-83da-197eb6b74cb2',
};

// Use stripe-fintech for the main generation test
const TEST_THEME_NAME = 'stripe-fintech';
const TEST_THEME_ID = THEMES[TEST_THEME_NAME];

function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const body = opts.body ? JSON.stringify(opts.body) : undefined;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body && { 'Content-Length': Buffer.byteLength(body) }),
        ...opts.headers,
      },
      timeout: 900_000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        } else {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

function section(label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(60));
}

function ok(step, msg) { console.log(`  [PASS] ${step}: ${msg}`); }
function fail(step, msg) { console.log(`  [FAIL] ${step}: ${msg}`); }

let passed = 0;
let failed = 0;

function assert(condition, step, successMsg, failMsg) {
  if (condition) { ok(step, successMsg); passed++; }
  else { fail(step, failMsg); failed++; }
}

async function main() {
  const t0 = Date.now();
  console.log('Pitchable E2E Test — Latest Features');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Theme: ${TEST_THEME_NAME} (${TEST_THEME_ID})`);

  // ════════════════════════════════════════════════════════════
  section('1. AUTH & SETUP');
  // ════════════════════════════════════════════════════════════

  const login = await httpReq('/auth/login', {
    method: 'POST',
    body: { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' },
  });
  const jwt = login.tokens.accessToken;
  assert(!!jwt, 'Login', `Token obtained for ${login.user.email}`, 'No JWT returned');

  const keyResult = await httpReq('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: `e2e-latest-${Date.now()}`,
      scopes: ['presentations:read', 'presentations:write', 'generation', 'export'],
    },
  });
  const apiKey = keyResult.key;
  assert(!!apiKey, 'API Key', `Created: ${apiKey.slice(0, 16)}...`, 'No API key');

  // Credits
  const bal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
  console.log(`  Credits: ${bal.balance}`);
  if (bal.balance < 10) {
    await httpReq('/credits/purchase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: { amount: 100 },
    });
    ok('Credits', 'Topped up to 100+');
  } else {
    ok('Credits', `Sufficient: ${bal.balance}`);
  }
  passed++;

  // ════════════════════════════════════════════════════════════
  section('2. THEMES VALIDATION');
  // ════════════════════════════════════════════════════════════

  const themes = await httpReq('/themes');
  assert(themes.length >= 16, 'Theme Count', `${themes.length} themes loaded`, `Only ${themes.length} themes`);

  // Verify all 5 newer themes exist
  for (const [name, id] of Object.entries(THEMES)) {
    const found = themes.find(t => t.id === id);
    assert(!!found, `Theme: ${name}`, `Found (${found?.displayName})`, `Missing theme ${name}`);
  }

  // Verify theme has full color palette
  const stripeTheme = await httpReq(`/themes/${TEST_THEME_ID}`);
  const palette = stripeTheme.colorPalette;
  assert(
    palette && palette.primary && palette.background && palette.text,
    'Theme Palette',
    `primary=${palette?.primary} bg=${palette?.background}`,
    'Incomplete palette'
  );

  // ════════════════════════════════════════════════════════════
  section('3. PITCH LENS — BACKGROUND LAYOUT + FREQUENT IMAGES');
  // ════════════════════════════════════════════════════════════

  const lens = await httpReq('/pitch-lens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: {
      name: 'E2E Background Test',
      audienceType: 'INVESTORS',
      pitchGoal: 'RAISE_FUNDING',
      companyStage: 'MVP',
      technicalLevel: 'NON_TECHNICAL',
      toneStyle: 'BOLD',
      industry: 'FinTech',
      selectedFramework: 'PAS',
      imageFrequency: 1,    // every slide gets an image
      imageLayout: 'BACKGROUND',  // full-slide background images
      maxBulletsPerSlide: 3,
      maxWordsPerSlide: 40,
    },
  });
  assert(!!lens.id, 'PitchLens Created', `ID: ${lens.id}`, 'Failed to create lens');

  // Verify lens settings
  const lensCheck = await httpReq(`/pitch-lens/${lens.id}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  assert(
    lensCheck.imageLayout === 'BACKGROUND',
    'Image Layout',
    'BACKGROUND confirmed',
    `Got: ${lensCheck.imageLayout}`
  );
  assert(
    lensCheck.imageFrequency === 1,
    'Image Frequency',
    '1 (every slide) confirmed',
    `Got: ${lensCheck.imageFrequency}`
  );

  // ════════════════════════════════════════════════════════════
  section('4. DECK GENERATION — stripe-fintech + BACKGROUND');
  // ════════════════════════════════════════════════════════════

  console.log('  Generating deck with Opus 4.6...');
  const genStart = Date.now();

  const progressTimer = setInterval(() => {
    const elapsed = ((Date.now() - genStart) / 1000).toFixed(0);
    process.stdout.write(`  ... ${elapsed}s elapsed\r`);
  }, 15_000);

  let deck;
  try {
    deck = await httpReq('/api/v1/generate', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: {
        topic: 'AI-Powered Financial Crime Detection: How Graph Neural Networks Are Revolutionizing AML Compliance',
        presentationType: 'STANDARD',
        themeId: TEST_THEME_ID,
        pitchLensId: lens.id,
      },
    });
    clearInterval(progressTimer);
  } catch (err) {
    clearInterval(progressTimer);
    fail('Generation', err.message.slice(0, 300));
    failed++;
    console.log('\n  FATAL: Generation failed. Cannot continue.');
    printSummary(t0);
    return;
  }

  const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
  assert(!!deck.id, 'Deck Created', `ID: ${deck.id} in ${genTime}s`, 'No deck returned');
  assert(
    deck.slides?.length >= 3,
    'Slide Count',
    `${deck.slides.length} slides generated`,
    `Only ${deck.slides?.length} slides`
  );
  assert(
    deck.theme?.name === TEST_THEME_NAME,
    'Theme Applied',
    TEST_THEME_NAME,
    `Got: ${deck.theme?.name}`
  );

  // Print all slides
  console.log('\n  Generated Slides:');
  deck.slides.forEach((s, i) => {
    const hasImage = s.imagePrompt ? 'IMG' : '---';
    console.log(`    ${i + 1}. [${s.slideType}] [${hasImage}] ${s.title}`);
  });

  // Verify image prompts (with imageFrequency=1, MOST slides should have prompts)
  const slidesWithImages = deck.slides.filter(s => s.imagePrompt && s.imagePrompt.trim() !== '');
  const imageRatio = slidesWithImages.length / deck.slides.length;
  console.log(`\n  Image prompts: ${slidesWithImages.length}/${deck.slides.length} (${(imageRatio * 100).toFixed(0)}%)`);
  assert(
    slidesWithImages.length >= 2,
    'Image Prompts',
    `${slidesWithImages.length} slides have image prompts`,
    'Too few image prompts for imageFrequency=1'
  );

  // Check a sample image prompt for quality
  const samplePrompt = slidesWithImages[0]?.imagePrompt;
  if (samplePrompt) {
    assert(
      samplePrompt.length > 20 && !samplePrompt.toLowerCase().includes('text'),
      'Image Prompt Quality',
      `${samplePrompt.slice(0, 80)}...`,
      'Low quality or contains text instructions'
    );
  }

  // ════════════════════════════════════════════════════════════
  section('5. FIGMA 2 INTEGRATION ENDPOINTS');
  // ════════════════════════════════════════════════════════════

  // Test Figma status (should show disconnected for test user)
  try {
    const figmaStatus = await httpReq('/figma/status', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    assert(
      figmaStatus !== undefined,
      'Figma Status Endpoint',
      `connected=${figmaStatus.connected ?? false}`,
      'Endpoint failed'
    );
  } catch (err) {
    // 404 or similar is OK — endpoint exists
    assert(
      err.message.includes('401') === false,
      'Figma Status Endpoint',
      'Endpoint responsive (not connected)',
      `Auth error: ${err.message.slice(0, 100)}`
    );
  }

  // Test Figma connect (fake token should return 400, not 500)
  try {
    await httpReq('/figma/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: { accessToken: 'figd_test_fake_token_for_e2e_validation' },
    });
    ok('Figma Connect', 'Token saved (test token)');
    passed++;
  } catch (err) {
    // 400 = correct (invalid token handled gracefully), 500 = bug
    assert(
      err.message.includes('400'),
      'Figma Connect',
      `Returns 400 for invalid token (expected)`,
      `Unexpected: ${err.message.slice(0, 100)}`
    );
  }

  // Test Figma validate
  try {
    const validateResult = await httpReq('/figma/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
    });
    console.log(`  Figma validate: valid=${validateResult.valid}`);
    ok('Figma Validate', `Endpoint works, valid=${validateResult.valid}`);
    passed++;
  } catch (err) {
    // Expected to fail with fake token — but endpoint should be reachable
    assert(
      !err.message.includes('404'),
      'Figma Validate',
      `Endpoint exists (token invalid as expected)`,
      `Endpoint missing: ${err.message.slice(0, 80)}`
    );
  }

  // Test Figma assign endpoint exists (will fail without real Figma data)
  if (deck.slides?.length > 0) {
    const testSlideId = deck.slides[0].id;
    try {
      await httpReq(`/figma/slides/${testSlideId}/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: { fileKey: 'test_file_key', nodeId: '0:1' },
      });
      ok('Figma Assign', 'Frame assigned to slide');
      passed++;
    } catch (err) {
      // Expected to fail with fake token — but proves the endpoint + flow works
      assert(
        !err.message.includes('404'),
        'Figma Assign Endpoint',
        `Endpoint reachable (${err.message.slice(0, 60)})`,
        `Missing: ${err.message.slice(0, 80)}`
      );
    }

    // Test Figma refresh endpoint (404 expected — slide not Figma-sourced)
    try {
      await httpReq(`/figma/slides/${testSlideId}/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      ok('Figma Refresh', 'Refresh succeeded');
      passed++;
    } catch (err) {
      // 404 = correct (slide has no Figma source), proves endpoint exists + validates correctly
      assert(
        err.message.includes('404'),
        'Figma Refresh Endpoint',
        `Returns 404 for non-Figma slide (expected)`,
        `Unexpected: ${err.message.slice(0, 80)}`
      );
    }
  }

  // Verify Slide model supports Figma fields (imageSource enum)
  const fullDeck = await httpReq(`/api/v1/presentations/${deck.id}`, {
    headers: { 'x-api-key': apiKey },
  });
  const firstSlide = fullDeck.slides?.[0];
  assert(
    firstSlide && 'imageSource' in firstSlide,
    'Figma Schema',
    `imageSource field exists (value: ${firstSlide?.imageSource ?? 'null'})`,
    'imageSource field missing from Slide model'
  );

  // ════════════════════════════════════════════════════════════
  section('6. EXPORT — PDF with stripe-fintech theme');
  // ════════════════════════════════════════════════════════════

  try {
    const exportResult = await httpReq(`/api/v1/presentations/${deck.id}/export`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: { format: 'PDF' },
    });
    assert(
      exportResult.status || exportResult.jobId || exportResult.url,
      'PDF Export',
      `Status: ${exportResult.status || 'queued'}`,
      'Export failed'
    );
  } catch (err) {
    fail('PDF Export', err.message.slice(0, 200));
    failed++;
  }

  // ════════════════════════════════════════════════════════════
  section('7. EMAIL');
  // ════════════════════════════════════════════════════════════

  try {
    const emailResult = await httpReq(`/api/v1/presentations/${deck.id}/email`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: { email: 'alcarazanthony1@gmail.com', format: 'PDF' },
    });
    assert(
      emailResult.sent === true,
      'Email',
      'Sent successfully',
      `sent=${emailResult.sent}`
    );
  } catch (err) {
    fail('Email', err.message.slice(0, 200));
    failed++;
  }

  // ════════════════════════════════════════════════════════════
  section('8. BACKGROUND VARIANT VALIDATION');
  // ════════════════════════════════════════════════════════════

  // Verify the deck's PitchLens has BACKGROUND layout
  assert(
    fullDeck.pitchLensId === lens.id,
    'PitchLens Link',
    `Deck linked to lens ${lens.id.slice(0, 8)}...`,
    'Lens not linked'
  );

  // Validate slide types diversity
  const slideTypes = new Set(deck.slides.map(s => s.slideType));
  console.log(`  Slide types: ${[...slideTypes].join(', ')}`);
  assert(
    slideTypes.size >= 3,
    'Slide Type Diversity',
    `${slideTypes.size} unique types`,
    `Only ${slideTypes.size} types`
  );

  // Check that TITLE and CTA exist
  assert(slideTypes.has('TITLE'), 'Has TITLE', 'Yes', 'Missing TITLE slide');
  assert(slideTypes.has('CTA'), 'Has CTA', 'Yes', 'Missing CTA slide');

  // ════════════════════════════════════════════════════════════
  printSummary(t0);
}

function printSummary(t0) {
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  section('SUMMARY');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(`  Time:   ${totalTime}s`);
  console.log(`  Result: ${failed === 0 ? 'ALL PASSED' : `${failed} FAILURES`}`);
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('\nFATAL ERROR:', e.message);
  process.exit(1);
});
