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

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **slide-saas** (3492 symbols, 7629 relationships, 249 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
