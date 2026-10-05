# Intelligence

@/Users/buivannin/.codex/RTK.md

Personal intelligence journal: Next.js App Router, TypeScript, Tailwind, Drizzle,
libSQL/Turso. Run commands from this repository root; Node.js >=22 and npm required.

## Operating rules

- V1 is the implemented scope. `plan.md` holds V2/V3 roadmap; implement those only
  after an explicit user request. No auth, external AI API or vector database in V1.
- Keep database/env access in Node server code or scripts. `src/lib/db.ts` is
  `server-only`; never import it into client components or expose tokens via
  `NEXT_PUBLIC_*`, `next.config` env, logs or documentation.
- Preserve imported raw Markdown verbatim. Uncertain parsing must stay nullable
  and produce review warnings; never invent facts, sources, dates or recommendations.
- Keep brief/items/sources writes atomic and the unique normalized SHA-256 hash.
  Different content on the same date is a separate version; dates are not unique.
- Keep domain/category extensible. UI translations must not change persisted enum
  values, query parameters, user content or parser field identifiers.
- Local UI uses Vietnamese, `lang=vi` and a working favicon. Preserve the dark
  editorial journal style: restrained typography, no decorative glow/gradients.
- Do not reset/delete personal data or seed the real shared DB implicitly. Restore
  accepts an empty migrated DB only; back up before destructive schema work.
- Read the central registry before changing ports; preserve other projects:
  `/Users/buivannin/Desktop/workspace/personal/dev-hub/projects.yml`.

## Runtime and checks

- Registry ID `intelligence`, path `news`, block `15000–15099`: app `15000`,
  Playwright `15090`, restart checks `15091`. App binds `127.0.0.1`.
- `.env.local` is the runtime file; `.env.example` is the tracked template.
  `dev`/`start` load it before Next boots. Restart after changing PORT/DB credentials.
- Setup: `rtk npm ci`; copy `.env.example` only when `.env.local` does not exist;
  `rtk npm run db:migrate`. Seed is optional synthetic data.
- Run `rtk npm run dev` in a visible interactive terminal. Keep logs available;
  after startup print clickable direct/proxy URLs, marking any unverified route.
- Validate according to the change: `rtk npm test` for parser/repository work,
  `rtk npm run test:e2e` for affected UI/workflows, `rtk npm run build` for production.
  E2E uses a temporary DB; never point it at personal/Turso data.
- Generate schema changes with `rtk npm run db:generate`, review committed SQL,
  then migrate the intended DB. No Docker is required by Intelligence itself.

## Load knowledge on demand

- Architecture, runtime/proxy, audit findings: `docs/project-guide.md`.
- Import/parser/persistence changes: `.agents/skills/intelligence-import/SKILL.md`.
- Setup, Daily Brief format and backup/restore: `README.md`.
- Scope, decisions, limitations and roadmap: `plan.md`.
- Use available global `frontend-design` / `ui-ux-pro-max` for UI design,
  `task-qa-review` for requested task QA, and `project-ai-bootstrap` for agent setup.
- Markdown is the source of truth. Update paired visual HTML in the same change;
  do not load HTML or every document when the current task only needs one reference.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
