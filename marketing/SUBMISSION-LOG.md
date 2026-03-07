# Pitchable Directory Submission Log

Last updated: 2026-03-07

## Submissions

| Directory | Status | Date | Notes |
|-----------|--------|------|-------|
| Launching Next | Submitted | 2026-03-07 | POST to /submit/ succeeded. 302 redirect to /thanks/?i=127414. Free tier, in review queue. Paid $99 option for 1-day review available but skipped. |
| BetaList | Blocked (login required) | 2026-03-07 | Redirects to sign-in page. Must create account first. 2-4 week queue after submission. |
| SaaSHub | Blocked (login required) | 2026-03-07 | Requires account creation + product verification via dashboard. No public API or open form. |
| Uneed | Blocked (login + Turnstile captcha) | 2026-03-07 | Requires Supabase account + Cloudflare Turnstile captcha. No API. |
| DevHunt | Blocked (login required) | 2026-03-07 | Next.js app, likely requires GitHub OAuth. No open submission endpoint found. |
| AI Tools Hunt | Draft ready | 2026-03-07 | Accepts email submissions to aitoolshunt@gmail.com. Draft saved below. |
| There's An AI For That | Blocked (unclear form) | 2026-03-07 | Page loads heavy JS; no visible open POST endpoint. Likely requires interaction. |
| Futurepedia | Blocked (paid) | 2026-03-07 | Pricing starts at $247 for Basic listing. No free submission form found. |
| TopAI.tools | Blocked (403) | 2026-03-07 | Returns 403 Forbidden on /submit. Cloudflare protection. |
| StartupStash | Blocked (reCAPTCHA v3) | 2026-03-07 | WordPress Contact Form 7 with Google reCAPTCHA v3. Cannot submit via curl. |
| SideProjectors | Blocked (login + CSRF) | 2026-03-07 | Requires authenticated session with CSRF token. |
| Hacker News | Blocked (login required) | 2026-03-07 | Must be logged in. Show HN post planned separately. |
| Crunchbase | Blocked (403) | 2026-03-07 | Returns 403. Requires authenticated account. |
| Startup Buffer | Blocked (403) | 2026-03-07 | Returns 403 Forbidden. |
| Startup Collections | Blocked (no form found) | 2026-03-07 | Page loads but no submission form fields detected in HTML. |
| Startup Tracker | Blocked (404 on /add) | 2026-03-07 | /add returns 404. Submission may be at /crowdsourcing/ but requires login. |
| GPT Demo | Blocked (500 error) | 2026-03-07 | Server error on /submit page. |
| MicroLaunch | Blocked (404) | 2026-03-07 | /submit returns 404. May have changed URL. |

## Summary

- **Submitted:** 1 (Launching Next)
- **Draft ready:** 1 (AI Tools Hunt email)
- **Blocked:** 16 (login/captcha/paid/errors)

## Next Steps

Most directories require manual browser-based submission with account creation. Priority order for manual submission:
1. BetaList (high traffic, free, just needs account)
2. There's An AI For That (high-traffic AI aggregator)
3. SaaSHub (good SEO, free listing)
4. Uneed (launch-focused)
5. DevHunt (developer audience)
6. Product Hunt (schedule proper launch day)

---

## AI Tools Hunt Email Draft

**To:** aitoolshunt@gmail.com
**Subject:** New AI Tool Submission: Pitchable - AI Pitch Deck Generator

Hi AI Tools Hunt team,

I'd like to submit Pitchable for listing on your directory.

**Tool Name:** Pitchable
**Website:** https://pitch-able.ai
**Tagline:** From brief to investor-ready deck in 2 minutes

**Description:**
Pitchable generates professional pitch decks from a brief, an uploaded document, or a topic. Users configure the pitch lens (audience, goal, tone, and framework), then the AI structures the content and renders it into slides. Any slide can be edited via natural language chat. Export to PPTX or PDF. AI-generated images included via Nano Banana 2.

**Key Stats:** 35 users, 182 presentations created, 143 exports

**Categories:** AI Tools, Presentations, Productivity, Startup Tools

**Pricing:** Freemium (Free tier with 15 credits, Starter $29/mo, Pro $79/mo, Enterprise custom)

**Founder:** Anthony Alcaraz

Thank you for considering Pitchable for your directory.

Best regards,
Anthony Alcaraz
