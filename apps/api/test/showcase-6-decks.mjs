/**
 * showcase-6-decks.mjs — Generate 6 diverse showcase decks for social proof.
 *
 * Each deck uses:
 * - A unique topic from real Obsidian vault / LinkedIn post content
 * - A distinct story framework
 * - A different theme
 * - Varied audience, tone, and technical depth
 *
 * After generation: exports PDF + PPTX, emails result.
 * Usage: node test/showcase-6-decks.mjs
 */
import http from 'node:http';

const BASE = 'http://localhost:3000';
const EMAIL = 'alcarazanthony1@gmail.com';

// ── 6 Showcase Configurations ──────────────────────────────────────────
const DECKS = [
  {
    // BACKGROUND images + high freq + BOLD tone (should produce VISUAL_HUMOR)
    label: '1/6 — VC Pitch: Agentic SaaS on AWS',
    topic: 'The Agentic SaaS Playbook: How autonomous AI agents are transforming enterprise software on AWS, from self-healing infrastructure to AI-driven customer success. $47B market by 2028.',
    presentationType: 'VC_PITCH',
    theme: { name: 'stripe-fintech', id: '2785c973-fee8-456b-9b30-ae36b8533c6d' },
    lens: {
      name: 'VC Pitch — Agentic SaaS [BG]',
      audienceType: 'INVESTORS',
      pitchGoal: 'RAISE_FUNDING',
      industry: 'Enterprise SaaS',
      companyStage: 'GROWTH',
      toneStyle: 'BOLD',
      technicalLevel: 'SEMI_TECHNICAL',
      selectedFramework: 'POPP',
      imageFrequency: 2,
      imageLayout: 'BACKGROUND',
      deckArchetype: 'INVESTOR_PITCH',
      customGuidance: 'Focus on TAM/SAM/SOM for agentic AI market. Include AWS as platform moat. Show customer traction with ARR growth. Highlight autonomous agents replacing human workflows. Include at least one VISUAL_HUMOR slide as a breather.',
    },
  },
  {
    // Formal + analytical = NO humor, minimal images, RIGHT layout
    label: '2/6 — Executive Briefing: GraphRAG for Enterprise Knowledge',
    topic: 'GraphRAG: Why knowledge graphs combined with retrieval-augmented generation outperform vector-only RAG by 67% on multi-hop reasoning. Enterprise deployment patterns, cost analysis, and adoption roadmap.',
    presentationType: 'EXECUTIVE',
    theme: { name: 'mckinsey-executive', id: 'd4cf8da3-2654-4e5c-85f7-f09292d1b2a0' },
    lens: {
      name: 'Executive Brief — GraphRAG',
      audienceType: 'EXECUTIVES',
      pitchGoal: 'GET_BUYIN',
      industry: 'Technology',
      companyStage: 'ENTERPRISE',
      toneStyle: 'ANALYTICAL',
      technicalLevel: 'SEMI_TECHNICAL',
      selectedFramework: 'MCKINSEY_SCR',
      imageFrequency: 4,
      imageLayout: 'RIGHT',
      deckArchetype: 'STRATEGY_BRIEF',
      customGuidance: 'McKinsey SCR: Situation (enterprises drowning in unstructured data), Complication (vector RAG fails on complex queries), Resolution (GraphRAG architecture). Use exact metrics from research. Include TCO comparison table.',
    },
  },
  {
    // BACKGROUND images + high freq + STORYTELLING tone (should produce VISUAL_HUMOR)
    label: '3/6 — Conference Talk: LLM Evaluation & Reasoning',
    topic: 'Beyond Benchmarks: How modern LLM evaluation is shifting from leaderboard scores to real-world reasoning validation. BenchmarkQED findings, domain-specific evaluation frameworks, and why 90% of enterprise LLM deployments fail quality gates.',
    presentationType: 'TECHNICAL',
    theme: { name: 'ted-talk', id: '9bf5ee10-9e0f-444b-979d-22ce77cb344c' },
    lens: {
      name: 'Conference — LLM Eval [BG]',
      audienceType: 'CONFERENCE',
      pitchGoal: 'EDUCATE',
      industry: 'AI/ML',
      companyStage: 'ENTERPRISE',
      toneStyle: 'STORYTELLING',
      technicalLevel: 'TECHNICAL',
      selectedFramework: 'TALK_LIKE_TED',
      imageFrequency: 2,
      imageLayout: 'BACKGROUND',
      deckArchetype: 'KEYNOTE',
      customGuidance: 'Open with a surprising failure story of a top-ranked LLM failing in production. Use data from BenchmarkQED research. Include comparison table of evaluation frameworks. Include 1-2 VISUAL_HUMOR slides as breathers between dense technical content. Close with actionable evaluation checklist.',
    },
  },
  {
    // RIGHT images + CONVERSATIONAL tone (should produce VISUAL_HUMOR)
    label: '4/6 — Team Enablement: Cloud Transformation Journey',
    topic: 'Enterprise Cloud Transformation: From legacy on-premise to cloud-native on AWS. Migration patterns, the 7 Rs framework, cost optimization strategies, and how organizations achieve 40% infrastructure savings within 18 months.',
    presentationType: 'STANDARD',
    theme: { name: 'apple-keynote', id: '3c0be2a6-27fc-4460-9ad1-4627e5a83890' },
    lens: {
      name: 'Team Enablement — Cloud',
      audienceType: 'TEAM',
      pitchGoal: 'EDUCATE',
      industry: 'Cloud Computing',
      companyStage: 'ENTERPRISE',
      toneStyle: 'CONVERSATIONAL',
      technicalLevel: 'TECHNICAL',
      selectedFramework: 'WHAT_SO_WHAT_NOW_WHAT',
      imageFrequency: 3,
      imageLayout: 'RIGHT',
      deckArchetype: 'TRAINING_WORKSHOP',
      customGuidance: 'What: current state of enterprise cloud adoption. So What: cost and agility implications of delayed migration. Now What: concrete 90-day migration plan using AWS Well-Architected Framework. Include a VISUAL_HUMOR slide to lighten the technical density.',
    },
  },
  {
    // HIGH image freq + BOLD tone (should produce VISUAL_HUMOR)
    label: '5/6 — Sales Pitch: AI-Powered Startup Fundraising',
    topic: 'Venture Capital Fundraising in 2026: How AI-native startups are raising at 3x the speed using data-driven pitch strategies. Median Series A now $14M. What VCs look for, common pitch mistakes, and the new fundraising playbook.',
    presentationType: 'STANDARD',
    theme: { name: 'yc-startup', id: '578e3902-b46d-4eb9-9e1b-7807c986c91b' },
    lens: {
      name: 'Sales — Startup Fundraising',
      audienceType: 'CUSTOMERS',
      pitchGoal: 'SELL_PRODUCT',
      industry: 'Venture Capital',
      companyStage: 'MVP',
      toneStyle: 'BOLD',
      technicalLevel: 'NON_TECHNICAL',
      selectedFramework: 'PAS',
      imageFrequency: 2,
      imageLayout: 'RIGHT',
      deckArchetype: 'SALES_DECK',
      customGuidance: 'Problem: founders waste 6 months on fundraising with a 2% success rate. Agitate: every rejected pitch costs $50K in opportunity cost. Solution: AI-powered pitch tools that double conversion rates. Include before/after metrics. Include 1 VISUAL_HUMOR slide.',
    },
  },
  {
    // Formal = NO humor, minimal images
    label: '6/6 — Board Report: AI Agent Production Systems',
    topic: 'AI Agents in Production: Moving from proof-of-concept to enterprise deployment. Multi-agent architectures, reliability engineering for autonomous systems, and why 73% of agent projects stall at the pilot stage. Lessons from production deployments at scale.',
    presentationType: 'EXECUTIVE',
    theme: { name: 'bcg-strategy', id: '0e4ed3d5-a2a5-4e90-9c10-b8a94d145cc8' },
    lens: {
      name: 'Board Report — AI Agents',
      audienceType: 'BOARD',
      pitchGoal: 'REPORT_RESULTS',
      industry: 'Enterprise AI',
      companyStage: 'ENTERPRISE',
      toneStyle: 'FORMAL',
      technicalLevel: 'SEMI_TECHNICAL',
      selectedFramework: 'MINTO_PYRAMID',
      imageFrequency: 4,
      imageLayout: 'RIGHT',
      deckArchetype: 'BOARD_UPDATE',
      customGuidance: 'Minto Pyramid: lead with the answer (agents are production-ready but require specific guardrails). Group supporting arguments: reliability metrics, cost analysis, risk mitigation. Include governance framework table.',
    },
  },
];

// ── HTTP Helper (900s timeout) ─────────────────────────────────────────
function httpReq(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Socket timeout (900s)')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Auth helpers ───────────────────────────────────────────────────────
const AUTH_CREDS = { email: 'test-themes@pitchable.dev', password: 'TestThemes2026!' };

async function freshLogin() {
  const login = await httpReq('/auth/login', { method: 'POST', body: AUTH_CREDS });
  return login.tokens.accessToken;
}

// Optional: skip decks that already succeeded (set to 0 to run all)
const SKIP_FIRST_N = parseInt(process.env.SKIP || '0', 10);

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(70));
  console.log('SHOWCASE DECK GENERATION — 6 Diverse Decks');
  console.log('Started:', new Date().toISOString());
  if (SKIP_FIRST_N > 0) console.log(`Skipping first ${SKIP_FIRST_N} decks (already done)`);
  console.log('='.repeat(70));

  // 1. Initial login + API key
  let jwt = await freshLogin();
  console.log('[AUTH] Logged in');

  const keyResult = await httpReq('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: { name: `showcase-${Date.now()}`, scopes: ['presentations:read', 'presentations:write', 'generation', 'export'] },
  });
  const apiKey = keyResult.key;
  console.log('[AUTH] API key:', apiKey.slice(0, 12) + '...');

  // 2. Check credits
  const bal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
  console.log('[CREDITS] Balance:', bal.balance);
  if (bal.balance < 30) {
    await httpReq('/credits/purchase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: { amount: 200 },
    });
    const newBal = await httpReq('/api/v1/credits/balance', { headers: { 'x-api-key': apiKey } });
    console.log('[CREDITS] Topped up to:', newBal.balance);
  }

  // 3. Create ALL lenses upfront (before JWT expires)
  console.log('\n[SETUP] Creating all pitch lenses upfront...');
  const lensIds = [];
  for (let li = 0; li < DECKS.length; li++) {
    if (li > 0) await sleep(2000); // avoid throttle
    const lens = await httpReq('/pitch-lens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: DECKS[li].lens,
    });
    lensIds.push(lens.id);
    console.log(`  Lens "${DECKS[li].lens.name}": ${lens.id}`);
  }

  // 4. Results tracking
  const results = [];
  const totalStart = Date.now();

  // 5. Generate each deck sequentially
  for (let i = 0; i < DECKS.length; i++) {
    if (i < SKIP_FIRST_N) {
      console.log(`\n[SKIP] Deck ${i + 1}/${DECKS.length} (already done)`);
      results.push({ label: DECKS[i].label, status: 'SKIPPED' });
      continue;
    }

    const cfg = DECKS[i];
    console.log('\n' + '─'.repeat(70));
    console.log(`[DECK ${cfg.label}]`);
    console.log(`  Topic:     ${cfg.topic.slice(0, 80)}...`);
    console.log(`  Theme:     ${cfg.theme.name}`);
    console.log(`  Framework: ${cfg.lens.selectedFramework}`);
    console.log(`  Audience:  ${cfg.lens.audienceType} | Tone: ${cfg.lens.toneStyle} | Tech: ${cfg.lens.technicalLevel}`);
    console.log('─'.repeat(70));

    const deckStart = Date.now();

    try {
      const lensId = lensIds[i];
      console.log(`  [LENS] Using: ${lensId}`);

      // Progress timer
      const timer = setInterval(() => {
        const s = ((Date.now() - deckStart) / 1000).toFixed(0);
        process.stdout.write(`  ... ${s}s elapsed\r`);
      }, 15_000);

      // Generate
      console.log('  [GEN] Starting generation...');
      const deck = await httpReq('/api/v1/generate', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: {
          topic: cfg.topic,
          presentationType: cfg.presentationType,
          themeId: cfg.theme.id,
          pitchLensId: lensId,
        },
      });

      clearInterval(timer);
      const genTime = ((Date.now() - deckStart) / 1000).toFixed(1);
      console.log(`  [GEN] SUCCESS in ${genTime}s — ${deck.slides?.length || '?'} slides`);

      // Print slide titles + count special types
      const humorSlides = [];
      const imageSlides = [];
      if (deck.slides) {
        deck.slides.forEach((s, idx) => {
          const imgTag = s.imagePrompt ? ' [IMG]' : '';
          console.log(`    ${idx + 1}. [${s.slideType}]${imgTag} ${s.title}`);
          if (s.slideType === 'VISUAL_HUMOR') humorSlides.push(idx + 1);
          if (s.imagePrompt || s.imageUrl) imageSlides.push(idx + 1);
        });
      }
      console.log(`  [STATS] Images: ${imageSlides.length} | VISUAL_HUMOR: ${humorSlides.length} (slides: ${humorSlides.join(',') || 'none'}) | Layout: ${cfg.lens.imageLayout || 'RIGHT'}`);

      // Export PDF
      let pdfOk = false;
      try {
        console.log('  [EXPORT] PDF...');
        const pdf = await httpReq(`/api/v1/presentations/${deck.id}/export`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { format: 'PDF' },
        });
        pdfOk = pdf.status === 'COMPLETED';
        console.log(`  [EXPORT] PDF: ${pdf.status}`);
      } catch (e) {
        console.log(`  [EXPORT] PDF FAILED: ${e.message.slice(0, 200)}`);
      }

      // Export PPTX
      let pptxOk = false;
      try {
        console.log('  [EXPORT] PPTX...');
        const pptx = await httpReq(`/api/v1/presentations/${deck.id}/export`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { format: 'PPTX' },
        });
        pptxOk = pptx.status === 'COMPLETED';
        console.log(`  [EXPORT] PPTX: ${pptx.status}`);
      } catch (e) {
        console.log(`  [EXPORT] PPTX FAILED: ${e.message.slice(0, 200)}`);
      }

      // Email PDF
      let emailOk = false;
      try {
        console.log(`  [EMAIL] Sending PDF to ${EMAIL}...`);
        const emailResult = await httpReq(`/api/v1/presentations/${deck.id}/email`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { email: EMAIL, format: 'PDF' },
        });
        emailOk = emailResult.sent === true;
        console.log(`  [EMAIL] ${emailOk ? 'SENT' : 'FAILED'}`);
      } catch (e) {
        console.log(`  [EMAIL] FAILED: ${e.message.slice(0, 200)}`);
      }

      results.push({
        label: cfg.label,
        status: 'SUCCESS',
        time: genTime,
        slides: deck.slides?.length || 0,
        images: imageSlides.length,
        humor: humorSlides.length,
        layout: cfg.lens.imageLayout || 'RIGHT',
        pdf: pdfOk,
        pptx: pptxOk,
        email: emailOk,
        id: deck.id,
      });

    } catch (err) {
      const elapsed = ((Date.now() - deckStart) / 1000).toFixed(1);
      console.log(`  [FAIL] ${err.message.slice(0, 500)}`);
      results.push({
        label: cfg.label,
        status: 'FAILED',
        time: elapsed,
        error: err.message.slice(0, 200),
      });
    }

    // Brief pause between decks to let system breathe
    if (i < DECKS.length - 1) {
      console.log('  [WAIT] 5s cooldown...');
      await sleep(5000);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - totalStart) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log('SHOWCASE GENERATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total time: ${totalTime} minutes`);
  console.log(`Completed:  ${new Date().toISOString()}\n`);

  const successes = results.filter(r => r.status === 'SUCCESS');
  const failures = results.filter(r => r.status === 'FAILED');

  console.log(`Results: ${successes.length} SUCCESS / ${failures.length} FAILED\n`);

  for (const r of results) {
    if (r.status === 'SKIPPED') {
      console.log(`  ${r.label} — SKIPPED`);
    } else if (r.status === 'SUCCESS') {
      console.log(`  ${r.label}`);
      console.log(`    ${r.slides} slides | ${r.images} imgs (${r.layout}) | ${r.humor} humor | ${r.time}s | PDF:${r.pdf ? 'OK' : 'FAIL'} | PPTX:${r.pptx ? 'OK' : 'FAIL'} | Email:${r.email ? 'OK' : 'FAIL'} | ID:${r.id}`);
    } else {
      console.log(`  ${r.label}`);
      console.log(`    FAILED after ${r.time}s: ${r.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
