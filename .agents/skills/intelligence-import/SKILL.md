---
name: intelligence-import
description: Change Intelligence Daily Brief parsing, import preview/save, duplicate detection or persistence while preserving original content and history. Use for this import workflow, not unrelated UI or roadmap features.
---

# Intelligence import workflow

Read the supported format in [README](../../../README.md), then inspect only
the affected layer: `src/lib/parser.ts`, `src/lib/repository.ts`,
`src/app/api/import/route.ts` or `src/app/import/page.tsx`. Read `src/lib/schema.ts`
and committed `drizzle/` migrations only when storage changes.

## Preserve the contract

- Structured Intelligence Data version `1` (also accept legacy `"1.0"`) between the
  reserved delimiters is authoritative. `src/lib/intelligence-data.ts` validates it
  before Markdown parsing; item/global field types are documented in README. Never
  add heading-derived items or override its date. A valid block always wins even when
  fallback is requested.
- Invalid JSON/schema/delimiters must block save with an actionable warning and an
  explicit fallback choice. Fallback scans only text outside the data block, while
  keeping the complete raw and persistent warning/review flag. Old briefs without
  a block use Legacy Markdown Parser automatically. Preview names the method.
- `worth_trying` accepts legacy strings and `{title, reason}` objects, stored on
  daily_briefs without inventing values. Legacy/migrated rows default to []; this does
  not enable V2 action workflows.
- `parseBrief` is deterministic and versioned. Accept explicit EN/VI labels and
  headings; unresolved fields remain null/unknown with review warnings.
- Raw is stored exactly as received. Only the duplicate hash normalizes CRLF and
  trims outer whitespace. Do not normalize the stored raw or rewrite old brief data.
- Missing/non-ISO date requires a user choice. Never use today's date silently.
- Preview reads but does not write. Save reparses on the server; client preview is
  not trusted as database input. Keep input limits and origin checks intact.
- Save brief, ordered items and sources in one transaction. Preserve hash uniqueness
  and duplicate race handling; same-date content revisions are legitimate history.
- Return actionable errors while preserving the user's textarea draft. Sources use
  `{name, url?}`; accept legacy `{url,label}`. A name without URL is stored with
  nullable URL and marked for review. V1 does not fetch, verify or generate sources.
  Impact accepts `very_high` in addition to the existing values.
- Update parserVersion when rule behavior changes materially. Existing V1 has no
  reparse/editor workflow; do not introduce one as part of an unrelated import fix.

## Validate the affected behavior

Use synthetic fixtures and temporary databases. `npm test` covers invalid/partial
parsing, atomic rollback, raw equality, duplicates, filters and reopen persistence.
`npm run test:e2e` covers clipboard fallback, preview/save, DB failure and production
restart on registry ports 15090/15091. Adapt meaningful checks to changed behavior;
do not write wording-only tests or import test data into the user's real database.

When the accepted format changes, update its canonical README example and the
import screen's example together. Record material decisions in `plan.md`; report
whether verification used a local file or actual Turso. Never print env tokens.
