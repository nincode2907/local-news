import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const briefs = sqliteTable(
  "daily_briefs",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    raw: text("raw_content").notNull(),
    hash: text("duplicate_hash").notNull().unique(),
    summary: text("summary"),
    signal: text("biggest_signal"),
    model: text("model_recommendation"),
    needsReview: integer("needs_review", { mode: "boolean" }).notNull(),
    warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull(),
    parserVersion: text("parser_version").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("brief_date_idx").on(t.date)],
);
export const items = sqliteTable(
  "news_items",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id")
      .notNull()
      .references(() => briefs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    domain: text("domain"),
    category: text("category"),
    facts: text("facts"),
    analysis: text("analysis"),
    recommendation: text("recommendation"),
    impact: text("impact").notNull(),
    raw: text("raw_section").notNull(),
    needsReview: integer("needs_review", { mode: "boolean" }).notNull(),
  },
  (t) => [
    index("item_brief_idx").on(t.briefId),
    index("item_filter_idx").on(t.domain, t.category, t.impact),
  ],
);
export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
  },
  (t) => [index("source_item_idx").on(t.itemId)],
);
