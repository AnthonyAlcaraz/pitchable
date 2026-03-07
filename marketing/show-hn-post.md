# Show HN Post — Pitchable

---

## Title

**Show HN: Pitchable – AI pitch deck generator using Marp CLI for rendering and BullMQ for async jobs**

---

## Body Comment (~400 words)

I've been building Pitchable (pitch-able.ai) for the past several months. It generates investor and client pitch decks from a brief, an uploaded document, or just a topic. I'm sharing it here because the rendering approach is a bit unusual and I'm curious whether the HN crowd has thoughts on it.

**The problem I kept running into**

Every pitch deck tool I tried fell into one of two buckets: (1) AI-generated text dropped into a template you still have to manually populate, or (2) beautiful design tools that assume you already know what you want to say. Neither gets you from zero to a complete, coherent, exportable deck without substantial manual effort.

**The technical approach**

The key decision was using Marp CLI as the rendering layer. Marp takes Markdown and turns it into slides — it's open-source, widely used by engineers for technical presentations, and crucially, it keeps slide content in a format an LLM can reason about, generate, and modify deterministically.

The flow looks like this:

1. User submits a brief or uploads a document (PDF, DOCX). NestJS backend runs entity extraction — pulling problem, market, solution, traction, and team signals via Claude.
2. A BullMQ job is enqueued for deck generation. Claude constructs structured Marp Markdown based on extracted entities, the user's selected pitch lens (audience, goal, tone, framework), and a layout template.
3. Marp CLI renders the Markdown to styled HTML slides. Nano Banana 2 (Replicate, google/nano-banana-2) handles image generation where needed.
4. The resulting deck is stored and served back. The user can then edit slides via chat — they type natural language instructions, Claude interprets them as Marp Markdown diffs, and the deck updates.
5. Final export runs through Marp CLI again to produce PPTX or PDF.

The whole stack: NestJS + Prisma + PostgreSQL + BullMQ + Marp CLI + Claude Opus 4.6/Sonnet 4.6 routing based on task complexity.

**What's live**

- 35 users in production
- 182 decks generated
- 377 chat edit messages processed
- 143 PPTX/PDF exports completed
- Free tier: 15 credits (2–3 full decks), no card required

Demo: pitch-able.ai

**Honest limitations**

- Marp-based layouts are Markdown-constrained. You get clean, consistent slides, not pixel-perfect design freedom.
- AI hallucinates market size numbers. I have a warning in the UI but I can't stop it from happening at generation time.
- Generation time is 2–15 minutes depending on deck complexity and BullMQ queue depth.
- Chat editing is instruction-based — it tells Claude what to change, not a direct editor. Complex layout changes sometimes require multiple chat turns.

Happy to answer questions on the Marp CLI integration, the BullMQ job structure, the entity extraction pipeline, or the credit pricing model.

---

## Anticipated HN Questions and Answers

---

**Q: Why Marp CLI instead of building your own rendering engine?**

Marp CLI is battle-tested, actively maintained, and free. It handles PDF/PPTX export, theming, and Markdown-to-slide conversion reliably. Building a custom renderer would have taken months for something Marp already does well. The tradeoff is layout flexibility — Marp is Markdown-based, so you can't do arbitrary pixel-perfect positioning. For business pitch decks, that constraint is mostly fine.

---

**Q: How do you handle hallucinations in generated content?**

Two approaches, neither perfect. First, entity extraction from uploaded documents anchors the generation in real content the user provided — Claude is filling in structure around their own data, not inventing it. Second, for market size and competitive claims specifically, the UI flags those slides with a "verify this data" notice. I've considered adding a citation step but haven't shipped it yet.

---

**Q: Is the Marp Markdown exposed to the user?**

Not by default. The chat interface abstracts it. But I'm considering a "raw Markdown" view for power users who want to edit directly. If you'd use that, let me know.

---

**Q: What does the BullMQ queue look like under load?**

Each deck generation job runs as a single BullMQ job with a 15-minute timeout. During high load, jobs queue and users see a progress indicator. I haven't had more than a handful of concurrent users yet, so queue depth hasn't been a real problem. The architecture supports horizontal workers if it becomes one.

---

**Q: Why not just use GPT or Gemini? Why Claude specifically?**

Two reasons. Claude handles long, structured Markdown generation reliably — the Haiku model is fast and cheap for simple edits, Sonnet for full deck generation. I also find Claude less likely to produce garbled Marp syntax on complex slide structures. I haven't done systematic evals; this is empirical from building the thing.

---

**Q: Credit model — why not just charge per seat?**

Credits map more naturally to actual usage (a long deck with image generation costs more compute than a short text-only deck). I'm still figuring out whether this is the right pricing model. Early users have been vocal about it — some prefer seats, some prefer credits. Open question.

---

**Q: Is the GitHub repo public?**

Not yet. The repo is private while I stabilize the core product. I'm open to making the Marp rendering pipeline or the entity extraction module open-source separately. Would anyone actually use that?

---
