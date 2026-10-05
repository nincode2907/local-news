import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "../src/lib/connection";
import { migrate } from "drizzle-orm/libsql/migrator";
import { parseBrief, validDate } from "../src/lib/parser";
import {
  importBrief,
  getBrief,
  listBriefs,
  searchItems,
  hashBrief,
} from "../src/lib/repository";
import { items, briefs } from "../src/lib/schema";
test("parser rejects invalid and preserves uncertainty", () => {
  assert.throws(() => parseBrief(""));
  assert.throws(() => parseBrief("invalid"));
  assert.equal(validDate("2026-02-30"), false);
  const result = parseBrief(
    "# Daily Brief\nThis is a sufficiently long but unstructured daily brief.",
  );
  assert.equal(result.items.length, 0);
  assert.equal(result.summary, null);
  assert.equal(result.needsReview, true);
  assert.equal(result.date, null);
});
test("Vietnamese fields and partial parser failure", () => {
  const p = parseBrief(
    "# Daily Brief — 2026-10-05\n## Tóm tắt\nTóm tắt ngày.\n### Tin mới\nSự kiện: Có một thay đổi\nPhân tích: Cần quan sát\nKhuyến nghị: Thử nghiệm\nTác động: Cao\nNguồn: [Docs](https://example.com)\n### Tin thiếu\nNội dung tự do chưa rõ cấu trúc",
  );
  assert.equal(p.items.length, 2);
  assert.equal(p.items[0].facts, "Có một thay đổi");
  assert.equal(p.items[0].impact, "high");
  assert.equal(p.items[1].facts, null);
  assert.equal(p.items[1].needsReview, true);
});
test("migrate, seed, atomic import, duplicate, raw, search filters, restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "intelligence-"));
  const url = "file:" + join(dir, "test.db");
  let c = connect(url);
  try {
    await migrate(c.db, { migrationsFolder: "./drizzle" });
    for (const date of ["2026-10-03", "2026-10-04", "2026-10-05"])
      await importBrief(
        c.db,
        await readFile("fixtures/" + date + ".md", "utf8"),
      );
    const latest = await getBrief(c.db);
    assert.equal(latest?.date, "2026-10-05");
    assert.equal(latest?.items.length, 3);
    const raw = await readFile("fixtures/2026-10-05.md", "utf8");
    assert.equal(latest?.raw, raw);
    assert.equal(latest?.needsReview, false);
    const dup = await importBrief(c.db, raw);
    assert.equal(dup.duplicate, true);
    assert.equal(dup.id, latest?.id);
    assert.equal(hashBrief(raw), hashBrief(raw.replace(/\n/g, "\r\n")));
    assert.equal((await listBriefs(c.db)).length, 3);
    for (const q of [
      "From impressive",
      "fixed set",
      "dependable",
      "switching models",
    ])
      assert.ok((await searchItems(c.db, { q })).length > 0, q);
    assert.equal(
      (
        await searchItems(c.db, {
          date: "2026-10-05",
          domain: "AI",
          category: "Evaluation",
          impact: "high",
        })
      ).length,
      1,
    );
    assert.equal((await searchItems(c.db, { q: "%" })).length, 0);
    const partial =
      "# Daily Brief — 2026-10-06\nUnstructured but useful original text for a raw-only brief.";
    const result = await importBrief(c.db, partial);
    assert.equal((await getBrief(c.db, result.id))?.raw, partial);
    assert.equal((await getBrief(c.db, result.id))?.needsReview, true);
    const before = (await c.db.select().from(briefs)).length;
    const bad =
      "# Daily Brief — 2026-10-07\n## Summary\nAtomic failure test\n### Failure item\nFact: A complete fact\nImpact: high\nSources: https://example.com";
    await c.client.execute(
      "CREATE TRIGGER reject_items BEFORE INSERT ON news_items BEGIN SELECT RAISE(ABORT, 'test rollback'); END",
    );
    await assert.rejects(importBrief(c.db, bad));
    assert.equal((await c.db.select().from(briefs)).length, before);
    await c.client.execute("DROP TRIGGER reject_items");
    c.client.close();
    c = connect(url);
    assert.equal((await listBriefs(c.db)).length, 4);
    assert.equal((await c.db.select().from(items)).length, 7);
    await migrate(c.db, { migrationsFolder: "./drizzle" });
    assert.equal((await listBriefs(c.db)).length, 4);
  } finally {
    c.client.close();
    await rm(dir, { recursive: true, force: true });
  }
});
