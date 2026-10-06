import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connect } from "../src/lib/connection";
import { parseBrief, StructuredDataError } from "../src/lib/parser";
import { structuredExample } from "../src/lib/import-example";
import {
  importBrief,
  getBrief,
  listBriefs,
  hashBrief,
} from "../src/lib/repository";

const data = JSON.parse(
  structuredExample
    .split("---INTELLIGENCE-DATA-START---")[1]
    .split("---INTELLIGENCE-DATA-END---")[0],
);

test("migration preserves history and existing source rows while allowing name-only sources", async () => {
  const dir = await mkdtemp(join(tmpdir(), "intelligence-migration-"));
  const c = connect("file:" + join(dir, "old.db"));
  try {
    const migrationDir = join(dir, "migrations");
    await mkdir(join(migrationDir, "meta"), { recursive: true });
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    journal.entries = journal.entries.slice(0, 1);
    const filename = journal.entries[0].tag + ".sql";
    await writeFile(
      join(migrationDir, "meta", "_journal.json"),
      JSON.stringify(journal),
    );
    await writeFile(
      join(migrationDir, filename),
      await readFile(join("drizzle", filename)),
    );
    await migrate(c.db, { migrationsFolder: migrationDir });
    const raw = "Old raw Markdown kept exactly.\r\n  ";
    await c.client.execute({
      sql: "INSERT INTO daily_briefs (id,date,raw_content,duplicate_hash,needs_review,warnings,parser_version,created_at) VALUES (?,?,?,?,?,?,?,?)",
      args: [
        "old-brief",
        "2026-10-01",
        raw,
        hashBrief(raw),
        1,
        "[]",
        "rules-v1",
        "2026-10-01T00:00:00Z",
      ],
    });
    await c.client.execute({
      sql: "INSERT INTO news_items (id,brief_id,position,title,impact,raw_section,needs_review) VALUES (?,?,?,?,?,?,?)",
      args: ["old-item", "old-brief", 0, "Old item", "high", "Old section", 0],
    });
    await c.client.execute({
      sql: "INSERT INTO sources (id,item_id,url,label) VALUES (?,?,?,?)",
      args: ["old-source", "old-item", "https://example.com", "Example"],
    });
    await migrate(c.db, { migrationsFolder: "./drizzle" });
    const old = await getBrief(c.db, "old-brief");
    assert.equal(old?.raw, raw);
    assert.equal(old?.parserVersion, "rules-v1");
    assert.deepEqual(old?.worthTrying, []);
    const oldSource = await c.client.execute(
      "SELECT url,label FROM sources WHERE id='old-source'",
    );
    assert.deepEqual(oldSource.rows[0], {
      url: "https://example.com",
      label: "Example",
    });
    await c.client.execute({
      sql: "INSERT INTO sources (id,item_id,url,label) VALUES (?,?,?,?)",
      args: ["new-source", "old-item", null, "Google"],
    });
  } finally {
    c.client.close();
    await rm(dir, { recursive: true, force: true });
  }
});
function brief(value: unknown) {
  return `# Daily Brief — 2030-01-01\n## Summary\nMarkdown summary must not win.\n### Fake heading\nFact: Not authoritative\n---INTELLIGENCE-DATA-START---\n${JSON.stringify(value, null, 2)}\n---INTELLIGENCE-DATA-END---\n### Another fake heading\nFact: Still not authoritative`;
}

test("structured block is authoritative, including null fields and empty item lists", () => {
  const parsed = parseBrief(brief(data));
  assert.equal(parsed.importMethod, "Structured Intelligence Data");
  assert.equal(
    parseBrief(
      `---INTELLIGENCE-DATA-START---${JSON.stringify(data)}---INTELLIGENCE-DATA-END---`,
    ).importMethod,
    "Structured Intelligence Data",
  );
  assert.equal(
    parseBrief(brief(data), { allowLegacyFallback: true }).importMethod,
    "Structured Intelligence Data",
  );
  assert.equal(parsed.date, data.date);
  assert.equal(parsed.summary, data.daily_summary);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, data.items[0].title);
  assert.deepEqual(parsed.items[0].sources, [{ url: null, label: "Google" }]);
  assert.equal(parsed.items[0].impact, "very_high");
  assert.equal(parsed.items[0].needsReview, true);
  assert.equal(parsed.model, data.model_recommendation);
  assert.deepEqual(parsed.worthTrying, data.worth_trying);
  const compatible = parseBrief(
    brief({
      ...data,
      schema_version: "1.0",
      worth_trying: ["Legacy string"],
      items: [
        {
          ...data.items[0],
          impact: "high",
          sources: [{ url: "https://example.com", label: "Example" }],
        },
      ],
    }),
  );
  assert.deepEqual(compatible.worthTrying, ["Legacy string"]);
  assert.deepEqual(compatible.items[0].sources, [
    { url: "https://example.com", label: "Example" },
  ]);
  const empty = parseBrief(
    brief({ ...data, daily_summary: null, items: [], worth_trying: [] }),
  );
  assert.deepEqual(empty.items, []);
  assert.equal(empty.summary, null);
  assert.equal(empty.needsReview, true);
  const missing = parseBrief(
    brief({
      ...data,
      items: [{ title: "No inferred fields", impact: "unknown", sources: [] }],
    }),
  );
  assert.equal(missing.items[0].facts, null);
  assert.equal(missing.items[0].domain, null);
  assert.equal(missing.items[0].needsReview, true);
});

test("invalid JSON/schema is blocked; explicit legacy fallback skips the data block", () => {
  const invalid =
    "# Daily Brief — 2026-10-01\n## Summary\nLegacy summary\n---INTELLIGENCE-DATA-START---\n{broken JSON\n### JSON heading must not become news\nFact: Not a news item\n---INTELLIGENCE-DATA-END---\n### Legacy news\nFact: A labelled fact\nImpact: high\nSources: https://example.com";
  assert.throws(() => parseBrief(invalid), StructuredDataError);
  const fallback = parseBrief(invalid, { allowLegacyFallback: true });
  assert.equal(fallback.importMethod, "Legacy Markdown Parser");
  assert.equal(fallback.items.length, 1);
  assert.equal(fallback.items[0].title, "Legacy news");
  assert.equal(fallback.summary, "Legacy summary");
  assert.equal(fallback.needsReview, true);
  assert.match(fallback.warnings[0], /JSON không hợp lệ/);
  for (const value of [
    null,
    [],
    { ...data, schema_version: "2.0" },
    { ...data, date: "2026-02-30" },
    { ...data, items: "not an array" },
    { ...data, worth_trying: [{}] },
    { ...data, items: [{ ...data.items[0], facts: 42 }] },
    { ...data, items: [{ ...data.items[0], title: "" }] },
    { ...data, items: [{ ...data.items[0], impact: "huge" }] },
    {
      ...data,
      items: [
        {
          ...data.items[0],
          sources: [{ url: "javascript:alert(1)", label: "Unsafe" }],
        },
      ],
    },
    { ...data, daily_summary: [] },
  ])
    assert.throws(() => parseBrief(brief(value)), StructuredDataError);
  for (const field of Object.keys(data)) {
    const missing = { ...data };
    delete missing[field];
    assert.throws(() => parseBrief(brief(missing)), StructuredDataError, field);
  }
  for (const raw of [
    brief(data).replace("---INTELLIGENCE-DATA-END---", ""),
    brief(data) + "\n---INTELLIGENCE-DATA-START---",
    "---INTELLIGENCE-DATA-END---\n" + brief(data),
  ])
    assert.throws(() => parseBrief(raw), StructuredDataError);
  const unfinished = parseBrief(
    brief(data).replace("---INTELLIGENCE-DATA-END---", ""),
    { allowLegacyFallback: true },
  );
  assert.deepEqual(
    unfinished.items.map((i) => i.title),
    ["Fake heading"],
  );
});

test("older briefs use Legacy Markdown Parser automatically", async () => {
  const parsed = parseBrief(await readFile("fixtures/2026-10-03.md", "utf8"));
  assert.equal(parsed.importMethod, "Legacy Markdown Parser");
  assert.equal(parsed.items.length, 2);
  assert.deepEqual(parsed.worthTrying, []);
});

test("structured persistence, duplicate, raw equality, fallback and reopen", async () => {
  const dir = await mkdtemp(join(tmpdir(), "intelligence-structured-"));
  const url = "file:" + join(dir, "test.db");
  let c = connect(url);
  try {
    await migrate(c.db, { migrationsFolder: "./drizzle" });
    const raw = "  " + brief(data).replace(/\n/g, "\r\n") + "\r\n  ";
    const saved = await importBrief(c.db, raw);
    const result = await getBrief(c.db, saved.id);
    assert.equal(result?.raw, raw);
    assert.equal(result?.parserVersion, "structured-v1.1");
    assert.deepEqual(result?.worthTrying, data.worth_trying);
    assert.equal(result?.items.length, 1);
    assert.equal(result?.items[0].facts, data.items[0].facts);
    assert.deepEqual(
      result?.items[0].sources.map(({ url, label }) => ({ url, label })),
      [{ url: null, label: "Google" }],
    );
    assert.equal(result?.items[0].impact, "very_high");
    const bulkRaw = brief({
      ...data,
      date: "2030-01-02",
      items: Array.from({ length: 4 }, (_, index) => ({
        ...data.items[0],
        title: `Batched item ${index + 1}`,
        sources: [{ name: "Google" }],
      })),
    });
    const bulk = await importBrief(c.db, bulkRaw);
    const bulkSaved = await getBrief(c.db, bulk.id);
    assert.equal(bulkSaved?.items.length, 4);
    assert.ok(bulkSaved?.items.every((item) => item.sources.length === 1));
    const duplicate = await importBrief(
      c.db,
      raw.replace(/\r\n/g, "\n").trim(),
    );
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.id, saved.id);
    assert.equal((await listBriefs(c.db)).length, 2);
    await assert.rejects(
      importBrief(c.db, raw, "2030-01-01"),
      /Ngày phải khớp/,
    );
    const invalid =
      "# Daily Brief — 2026-10-01\nPlain text that should remain raw.\n---INTELLIGENCE-DATA-START---\n{broken}\n---INTELLIGENCE-DATA-END---";
    await assert.rejects(importBrief(c.db, invalid), StructuredDataError);
    assert.equal((await listBriefs(c.db)).length, 2);
    const fallback = await importBrief(c.db, invalid, undefined, {
      allowLegacyFallback: true,
    });
    const legacy = await getBrief(c.db, fallback.id);
    assert.equal(legacy?.raw, invalid);
    assert.equal(legacy?.items.length, 0);
    assert.equal(legacy?.needsReview, true);
    const rawOnly =
      "---INTELLIGENCE-DATA-START---\n{broken}\n---INTELLIGENCE-DATA-END---";
    assert.equal(parseBrief(rawOnly, { allowLegacyFallback: true }).date, null);
    const rawSaved = await importBrief(c.db, rawOnly, "2026-10-07", {
      allowLegacyFallback: true,
    });
    assert.equal((await getBrief(c.db, rawSaved.id))?.raw, rawOnly);
    assert.equal((await getBrief(c.db, rawSaved.id))?.items.length, 0);
    c.client.close();
    c = connect(url);
    assert.deepEqual(
      (await getBrief(c.db, saved.id))?.worthTrying,
      data.worth_trying,
    );
  } finally {
    c.client.close();
    await rm(dir, { recursive: true, force: true });
  }
});
