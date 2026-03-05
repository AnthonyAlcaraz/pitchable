# Product Hunt Launch Assets — Pitchable

---

## Tagline (60 chars max)

> From brief to investor-ready deck in 2 minutes

*(57 chars)*

**Alternatives:**
- "Your pitch deck, generated in minutes, not days" (49 chars)
- "Turn your idea into a fundable deck, fast" (42 chars)
- "Skip the slide design. Ship the pitch." (39 chars)

---

## Short Description (260 chars max)

Pitchable turns a brief, a doc, or just a topic into a full pitch deck. Claude LLMs structure your content, Marp CLI renders it, and you edit slides in plain English via chat. PPTX + PDF export. Free tier includes 2–3 complete decks. (234 chars)

---

## Full Description (PH page body)

**What Pitchable does**

You drop in a brief, paste a document, or just type your startup's topic. Pitchable extracts the key entities — market, problem, solution, traction — and generates a full slide deck, structured and styled, in 2 to 15 minutes.

You control the lens before generation:
- **Audience**: investors, customers, internal teams, or press
- **Goal**: fundraising, sales, partnership, or awareness
- **Tone**: formal, conversational, bold
- **Framework**: Problem/Solution, MECE pyramid, Narrative arc, and more

Once the deck is generated, you edit slides via chat. "Make slide 3 shorter." "Add a market sizing breakdown." "Rewrite the CTA as a question." No slide editor to learn.

**Export to PPTX or PDF.** Images generated via Nano Banana 2 (Replicate). McKinsey theme included.

**The technical stack (for the curious)**

Rendering runs on Marp CLI — the same open-source Markdown-to-slide engine used by engineers globally. This means slides are reproducible, version-controllable, and not trapped in a proprietary format. BullMQ handles async generation jobs so your UI doesn't block during rendering. NestJS + Prisma + PostgreSQL on the backend.

**What's free**

Free tier ships with 15 credits — enough for 2 to 3 complete decks at no cost, no card required.

**Honest limitations**

- AI sometimes hallucinates market size numbers. Always verify stats before presenting.
- Layout precision is Markdown-based; you won't get pixel-perfect custom designs.
- Generation takes 2–15 minutes depending on deck complexity and queue depth.
- Chat editing is powerful but not an Ace Editor — it issues instructions, not direct manipulation.

**Numbers so far (real users, not projections)**

- 20 users in production
- 177 presentations created
- 360 chat messages sent (users actually iterate, not just export-once)
- 34 successful exports to PPTX/PDF

Built by Anthony Alcaraz. If you're raising a round, pitching a client, or building a business case, Pitchable cuts the slide-building time to near zero.

---

## First Comment (Founder Story) ~300 words

I built Pitchable because I spent 11 hours making a deck that got ignored in 4 minutes.

It was a partnership pitch for a consulting project. I wrestled with PowerPoint, agonized over alignment, rewrote the narrative three times. The prospect glanced at it and said "looks good" and asked me to just send the summary in an email.

I thought: this is the wrong problem. The deck took longer to make than the meeting lasted.

So I started building. The hard part wasn't generating text — LLMs can do that. The hard part was generating a *structured, styled, exportable slide deck* from that text. Most tools either generate ugly decks or hand you beautiful templates you still have to fill manually.

I landed on Marp CLI as the rendering layer: it takes Markdown and turns it into slides. That keeps the content in a format Claude can reason about, iterate on, and edit via natural language. No opaque binary formats, no locked-in editors.

The result: you give Pitchable a brief or a doc, pick your audience and goal, and get a full deck in 2 to 15 minutes. Then you edit it by chatting. "Add a competitive landscape slide." "Cut the third bullet on every slide." It works.

**What's free**: 15 credits on sign-up. No card required. That's 2 to 3 full decks at zero cost.

**What's imperfect**: AI sometimes invents market size numbers. Layouts are Markdown-based, not pixel-perfect. Generation queue can take up to 15 minutes when busy.

20 users have created 177 presentations and sent 360 chat messages iterating on them. 34 decks exported to PPTX or PDF.

I'd love your feedback. Try it at pitch-able.ai.

— Anthony

---

## Category Suggestions

Primary: **Productivity**
Secondary: **Artificial Intelligence**, **Design Tools**, **Startups**

Additional tags: pitch decks, presentations, AI writing, fundraising, business tools

---

## Screenshot / GIF Shot List

### Screenshot 1 — Empty brief → Generated deck (before/after)
- Left panel: blank or minimal brief input field
- Right panel: fully generated 10-slide deck
- Caption: "Input a brief. Get a structured deck."
- Format: side-by-side static screenshot

### Screenshot 2 — Pitch Lens configurator
- Show the audience / goal / tone / framework selector
- Annotate the 4 controls with arrows
- Caption: "Configure before you generate — not after."
- Format: static screenshot with callout annotations

### Screenshot 3 — Chat-based slide editing
- Chat panel open, user typed "Make slide 3 shorter"
- Slide panel shows the before/after of slide 3
- Caption: "Edit slides in plain English."
- Format: GIF (5–8 seconds, looped): type message → slide updates

### Screenshot 4 — McKinsey theme / styled deck preview
- Full deck in McKinsey theme, clean slide grid view
- Show 6–8 slides in the gallery
- Caption: "Structured slides, professional themes."
- Format: static screenshot

### Screenshot 5 — Export modal
- PPTX / PDF export dialog open
- Show export options and a completed export confirmation
- Caption: "Export to PPTX or PDF in one click."
- Format: static screenshot

### Screenshot 6 — Document upload → Entity extraction
- Upload modal with a document dropped in
- Extracted entities panel visible (market, problem, solution, traction)
- Caption: "Upload a doc. Pitchable pulls the pitch out."
- Format: GIF (upload → extraction result appears)

### Screenshot 7 — Stats / social proof callout
- Design a simple graphic: "177 decks generated. 34 exports. 20 users."
- Can be a simple dark card, no animation needed
- Format: 1200x628 static image for PH thumbnail

---
