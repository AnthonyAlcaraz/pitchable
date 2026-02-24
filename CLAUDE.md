# Pitchable (slide-saas)

## Workflow Rules (MANDATORY)

**Every change MUST be committed and pushed immediately after verification.**

```bash
# After ANY code change:
cd ~/projects/slide-saas/apps/api && npx tsc --noEmit  # API type check
cd ~/projects/slide-saas/apps/web && npx tsc -b          # Frontend type check (strict, matches Railway)
cd ~/projects/slide-saas && git add <changed-files>
git commit -m "type: description"
git push
```

**Commit types:** `feat`, `fix`, `refactor`, `chore`, `docs`

### Railway Deploy Verification (MANDATORY after every push)

```bash
gh api repos/AnthonyAlcaraz/pitchable/deployments --jq '.[0] | {sha: .sha[0:7], created_at}'
sleep 120
gh api repos/AnthonyAlcaraz/pitchable/deployments --jq '.[0].id' | xargs -I{} gh api repos/AnthonyAlcaraz/pitchable/deployments/{}/statuses --jq '.[0].state'
```

**Railway gotchas:**
- `tsc -b` with `noUnusedLocals: true` — stricter than local `tsc --noEmit`
- Docker build fails on missing transitive deps (e.g., `undici`) — add explicitly to package.json
- Domain: **pitch-able.ai** | Project: **sweet-courtesy**

## Test Credentials

- **User:** overflow-test@test.com / OverTest1234
- **Pro User:** pro-test@pitchable.ai / ProTest1234 (PRO tier, 500 credits)
- **API Key:** `pk_2b0ea28428e50a20789cfe73bc9aa04864bf1aef33f30632157471476b5d5751`
- **McKinsey theme ID:** `d4cf8da3-2654-4e5c-85f7-f09292d1b2a0`

## Hard Constraints

1. **Never edit `.env`** — read-only, contains secrets
2. **Schema changes** require `prisma db push` + `prisma generate` + recompile
3. **Both generation paths must stay in sync** — `chat/generation.service.ts` + `api-v1/sync-generation.service.ts`
4. **Image prompts** must include "no text/words/letters" instruction
5. **McKinsey theme** triggers special CSS (white bg, navy dividers, Georgia serif) — don't break it
6. **Content reviewer** accepts optional `customLimits: DensityLimits` parameter
7. **Kill server**: `PID=$(netstat -ano | grep ":3000" | grep LISTEN | awk '{print $5}' | head -1) && taskkill //PID $PID //F`
