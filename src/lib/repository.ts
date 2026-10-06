import { createHash, randomUUID } from "node:crypto";
import { eq, desc, and, sql } from "drizzle-orm";
import { briefs, items, sources } from "./schema";
import { parseBrief, validDate, type ParseOptions } from "./parser";
import type { connect } from "./connection";
type DB = ReturnType<typeof connect>["db"];
const chunked = <T>(values: T[], size = 100) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
export const hashBrief = (raw: string) =>
  createHash("sha256").update(raw.replace(/\r\n/g, "\n").trim()).digest("hex");
export async function importBrief(
  db: DB,
  raw: string,
  dateOverride?: string,
  options: ParseOptions = {},
) {
  const parsed = parseBrief(raw, options);
  if (
    parsed.importMethod === "Structured Intelligence Data" &&
    dateOverride &&
    dateOverride !== parsed.date
  )
    throw new Error("Ngày phải khớp date trong Structured Intelligence Data.");
  const date = dateOverride || parsed.date;
  if (!date || !validDate(date))
    throw new Error("Hãy chọn ngày hợp lệ (YYYY-MM-DD).");
  const hash = hashBrief(raw);
  const existing = await db
    .select()
    .from(briefs)
    .where(eq(briefs.hash, hash))
    .limit(1);
  if (existing[0]) return { id: existing[0].id, duplicate: true };
  const id = randomUUID();
  const itemRows = parsed.items.map((item, position) => {
    const itemId = randomUUID();
    return {
      row: {
        id: itemId,
        briefId: id,
        position,
        title: item.title,
        domain: item.domain,
        category: item.category,
        facts: item.facts,
        analysis: item.analysis,
        recommendation: item.recommendation,
        impact: item.impact,
        raw: item.raw,
        needsReview: item.needsReview,
      },
      sources: item.sources.map((source) => ({
        id: randomUUID(),
        itemId,
        ...source,
      })),
    };
  });
  try {
    await db.transaction(async (tx) => {
      await tx.insert(briefs).values({
        id,
        date,
        raw,
        hash,
        summary: parsed.summary,
        signal: parsed.signal,
        model: parsed.model,
        worthTrying: parsed.worthTrying,
        needsReview: parsed.needsReview,
        warnings: parsed.warnings,
        parserVersion: parsed.parserVersion,
        createdAt: new Date().toISOString(),
      });
      for (const batch of chunked(itemRows.map(({ row }) => row)))
        await tx.insert(items).values(batch);
      const sourceRows = itemRows.flatMap(
        ({ sources: itemSources }) => itemSources,
      );
      for (const batch of chunked(sourceRows))
        await tx.insert(sources).values(batch);
    });
  } catch (error) {
    const raced = await db
      .select()
      .from(briefs)
      .where(eq(briefs.hash, hash))
      .limit(1);
    if (raced[0]) return { id: raced[0].id, duplicate: true };
    throw error;
  }
  return { id, duplicate: false };
}
export async function listBriefs(db: DB) {
  return db
    .select()
    .from(briefs)
    .orderBy(desc(briefs.date), desc(briefs.createdAt));
}
export async function getBrief(db: DB, id?: string) {
  const brief = id
    ? (await db.select().from(briefs).where(eq(briefs.id, id)).limit(1))[0]
    : (await listBriefs(db))[0];
  if (!brief) return null;
  const news = await db
    .select()
    .from(items)
    .where(eq(items.briefId, brief.id))
    .orderBy(items.position);
  return {
    ...brief,
    items: await Promise.all(
      news.map(async (i) => ({
        ...i,
        sources: await db
          .select()
          .from(sources)
          .where(eq(sources.itemId, i.id)),
      })),
    ),
  };
}
export async function searchItems(db: DB, filter: Record<string, string>) {
  const conditions = [];
  if (filter.q) {
    const q = "%" + filter.q.replace(/[!%_]/g, "!$&") + "%";
    conditions.push(
      sql`(${items.title} LIKE ${q} ESCAPE '!' OR ${items.facts} LIKE ${q} ESCAPE '!' OR ${items.analysis} LIKE ${q} ESCAPE '!' OR ${items.recommendation} LIKE ${q} ESCAPE '!')`,
    );
  }
  if (filter.date) conditions.push(eq(briefs.date, filter.date));
  if (filter.domain) conditions.push(eq(items.domain, filter.domain));
  if (filter.category) conditions.push(eq(items.category, filter.category));
  if (filter.impact) conditions.push(eq(items.impact, filter.impact));
  const rows = await db
    .select({ item: items, date: briefs.date })
    .from(items)
    .innerJoin(briefs, eq(items.briefId, briefs.id))
    .where(and(...conditions))
    .orderBy(desc(briefs.date), items.position);
  return Promise.all(
    rows.map(async (r) => ({
      ...r.item,
      date: r.date,
      sources: await db
        .select()
        .from(sources)
        .where(eq(sources.itemId, r.item.id)),
    })),
  );
}
