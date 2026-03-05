# Reddit Posts — Pitchable

---

## Post 1 — r/SaaS

**Title:**
I built an AI pitch deck generator. Here's what 20 real users taught me (numbers inside).

---

**Body:**

I've been building Pitchable (pitch-able.ai) for about 6 months — it generates pitch decks from a brief, an uploaded document, or a topic using Claude LLMs and Marp CLI for rendering. I recently crossed 20 users, 177 presentations, and 34 exports. Here's what the data and conversations actually showed me, because most of it surprised me.

---

**1. My assumed user was wrong.**

I built it for startup founders raising rounds. The users who iterate most — sending 5+ chat edits per session — are management consultants, not founders. They produce more decks, have higher quality standards, and are more willing to iterate than first-time fundraisers who just want "something that looks like a real deck."

Implication: I'm now building features (McKinsey framework, MECE structure, formal tone presets) that serve the consultant use case more explicitly.

---

**2. Activation is entirely about time-to-first-deck.**

If a user doesn't see a generated deck in their first session, they don't come back. I track this. The users who got a deck in under 5 minutes returned at roughly 3x the rate of users who waited 10–15 minutes.

This drove me to optimize the BullMQ queue for short decks, add a real-time step indicator ("Extracting entities → Structuring narrative → Rendering slides"), and reduce the default slide count for new users' first generation.

---

**3. The chat editor is the retention driver, not the generator.**

360 chat messages across 177 decks = average 2 edits per deck. But the distribution is not uniform. Users who sent 1 edit session had 40% churn within a week. Users who sent 5+ edits had near-zero churn. The generator gets them in the door. The editor keeps them.

I did not expect this going in. I thought people would generate once and export. They don't. They iterate.

---

**4. Framing free tier as "decks" not "credits" doubled conversion.**

"15 credits free" confused people on the landing page. One user literally emailed asking if the credits were points or dollars. Switching to "2–3 complete decks free — no card required" on the same page with no other changes improved trial signups significantly.

Lesson: if your pricing unit requires explanation, you have the wrong unit facing users.

---

**5. Document upload is underused but produces the best decks.**

Only about 30% of users upload a document. But those who do produce decks with fewer hallucinations and edit less. When the AI is grounded in user-provided content (an existing one-pager, a market analysis, a product spec), the output is substantially better than pure brief-to-deck generation.

I haven't cracked onboarding for this yet. Users default to the brief because it looks simpler. Working on that.

---

**6. Hallucination on market sizing is the #1 support complaint.**

I knew this would happen. I shipped anyway with a "verify this data" warning in the UI. Still got complaints. The complaints are not about the AI being wrong — they're about the AI being *confidently wrong* in a way that would embarrass someone in front of an investor.

The real fix isn't prompt engineering. It's requiring users to provide the data they want cited, not letting the AI generate it from thin air. That's in the roadmap.

---

**Technical stack for the curious:**

- NestJS + Prisma + PostgreSQL backend
- BullMQ for async deck generation jobs
- Marp CLI for rendering (Markdown → slides → PPTX/PDF)
- Claude Sonnet for full deck generation, Claude Haiku for chat edits
- Nano Banana 2 (Replicate) for image generation
- Free: 15 credits | Starter: $29/mo | Pro: $79/mo

Happy to go deep on any of this. Architecture, pricing, acquisition, or product decisions — ask anything.

---

**Honest limitations so you know what you're getting into:**

- Marp-based layouts are Markdown-constrained. Not pixel-perfect custom design.
- Generation takes 2–15 minutes. Not instant.
- Hallucinations in AI-generated stats are real and I haven't fully solved them.
- The chat editor issues instructions to Claude, not direct slide manipulation. Complex changes sometimes need 2–3 turns.

---

## Post 2 — r/startups

**Title:**
From idea to 20 users — lessons building Pitchable (an AI deck generator, not a pitch deck)

---

**Body:**

I've been building Pitchable in public for 6 months. It's an AI pitch deck generator — not a template filler, not a slide design tool. You give it a brief, it gives you a full deck with structure, content, and export in 2 to 15 minutes. Here's what building it actually looked like.

---

**Why I built it**

I was preparing a consulting pitch and spent 11 hours on the deck. The prospect dismissed it in under 4 minutes. The deck wasn't bad — it was just late, rushed, and built in PowerPoint at 2am while exhausted. The deck-building process had consumed more time than the meeting it was built for.

I looked at existing tools. All of them start from design — template pickers, drag-and-drop editors. None of them start from the pitch narrative. The hard part isn't "make this look good." The hard part is "what do I say, in what order, and why."

---

**The core technical decision**

I used Marp CLI for rendering. It's open-source Markdown-to-slides. The reason: if slides are Markdown, an LLM can generate them, edit them, and version-control them natively. You're not asking AI to output some proprietary JSON blob and then parse it back into a slide editor. You're working with a format the model already understands well.

This also means exports to PPTX and PDF work properly because Marp CLI handles that natively — it's been battle-tested by thousands of engineers making technical presentations.

---

**Building and shipping**

The first version generated ugly decks in 8 minutes. I shipped it anyway to 5 people I knew. The feedback was consistent: "the structure is actually right, but the formatting needs work." That told me the narrative generation was working. Formatting was fixable.

I iterated on themes, added the McKinsey style preset, and added the chat editor. The chat editor turned out to be the feature that made people come back. Users who iterate via chat (5+ messages) have near-zero churn. Users who generate once and export never return.

---

**What 20 users look like in practice**

- 177 decks generated
- 360 chat edit messages
- 34 PPTX/PDF exports
- Average: 2 chat edits per deck
- Highest usage user: 19 decks, 47 chat messages

The user with the highest usage is a freelance management consultant who uses it to build initial client decks before polish. Not a founder. Not the user I built for.

---

**What I'd do differently**

Run user interviews before picking the audience. I assumed founders. The product actually fits consultants better — they have more decks to build and iterate more aggressively. I wasted about 2 months optimizing messaging for founders while consultants were quietly becoming my best users.

Also: ship the progress indicator earlier. Users assumed the generation was broken after 90 seconds of silence. A real-time step log ("Rendering slide 4 of 12") eliminated those "is this stuck?" messages entirely.

---

**Where it is now**

Free: 15 credits, 2–3 complete decks, no card.
Starter: $29/mo
Pro: $79/mo
Enterprise: custom

pitch-able.ai — feedback welcome.

---

## Comment Template — r/Entrepreneur (Deck-Related Threads)

**For threads like:** "How do you build pitch decks fast?" / "Best tools for investor presentations?" / "Anyone else spending way too long on decks?"

---

**Template:**

Built a tool for this exact problem — Pitchable (pitch-able.ai).

You input a brief or upload a doc, pick your audience and framework (investor pitch, sales deck, MECE structure, etc.), and get a full deck in 2–15 minutes. Edit via chat afterward. Export to PPTX or PDF.

Free tier is 15 credits — covers 2–3 complete decks, no card required.

Honest caveat: it's Markdown-based rendering (Marp CLI), so you won't get pixel-perfect custom layouts. But for getting a coherent first draft or investor-ready narrative out fast, it works well. 177 decks generated by real users so far.

Happy to answer questions if this is relevant to what you're building.

---

**Shorter variant (for threads where long comments get buried):**

Shameless plug: I built pitch-able.ai for this. Brief or doc in → full deck in 2–15 min → chat to edit → PPTX/PDF export. Free tier covers 2–3 decks. Marp CLI under the hood, so layouts are structured but not infinitely custom. 177 decks generated. Try it if the timing is right.

---

## Reddit Posting Rules

**General:**
- Never post the same text across multiple subreddits. Each post above is written for its specific community.
- r/SaaS responds to data and honest reflection on building. Lead with numbers and real surprises.
- r/startups responds to founder journey and concrete lessons. They want to know if you actually learned something.
- r/Entrepreneur comment threads: be helpful first, promotional second. If you can't add value beyond the plug, don't comment.

**Timing:**
- Post r/SaaS and r/startups on weekday mornings (Mon–Wed, 9–11am ET). Weekend posts get buried.
- Engage with every top-level comment within 3 hours. Reddit rewards fast responders with algorithmic visibility.

**What to avoid:**
- Do not cross-post the same text. Mods will remove it.
- Do not post "feedback wanted" with a link and no content. It reads as spam.
- Do not delete and repost if a post underperforms. It's banned in most subs.
- Do not use "I" as your opener on r/SaaS — the algorithm penalizes it. Start with the insight or the number.
