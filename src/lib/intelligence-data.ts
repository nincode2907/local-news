import type { ParsedBrief, ParsedItem, WorthTryingEntry } from "./parser";
import { validDate } from "./date";

export const DATA_START = "---INTELLIGENCE-DATA-START---";
export const DATA_END = "---INTELLIGENCE-DATA-END---";

export class StructuredDataError extends Error {
  constructor(detail: string) {
    super(
      `Structured Intelligence Data không hợp lệ: ${detail}. Sửa JSON hoặc chọn Legacy Markdown Parser để lưu theo Markdown/bản gốc.`,
    );
    this.name = "StructuredDataError";
  }
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${field} phải là object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${field} phải là chuỗi không trống`);
  return value;
}

function nullable(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field);
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} phải là array`);
  return value;
}

function validate(value: unknown): ParsedBrief {
  const data = object(value, "data");
  if (data.schema_version !== 1 && data.schema_version !== "1.0")
    throw new Error(
      'schema_version phải là 1 (hoặc chuỗi "1.0" để tương thích)',
    );
  for (const field of [
    "date",
    "daily_summary",
    "biggest_signal",
    "model_recommendation",
    "items",
    "worth_trying",
  ])
    if (!Object.hasOwn(data, field)) throw new Error(`Thiếu trường ${field}`);
  const date = text(data.date, "date");
  if (!validDate(date))
    throw new Error("date phải là ngày ISO hợp lệ (YYYY-MM-DD)");
  const summary = nullable(data.daily_summary, "daily_summary");
  const warnings: string[] = [];
  const items = array(data.items, "items").map((value, index): ParsedItem => {
    const field = `items[${index}]`;
    const item = object(value, field);
    const title = text(item.title, `${field}.title`);
    if (
      !["very_high", "high", "medium", "low", "unknown"].includes(
        item.impact as string,
      )
    )
      throw new Error(
        `${field}.impact phải là very_high, high, medium, low hoặc unknown`,
      );
    const sources = array(item.sources, `${field}.sources`).map(
      (value, sourceIndex) => {
        const sourceField = `${field}.sources[${sourceIndex}]`;
        const source = object(value, sourceField);
        const url =
          source.url == null ? null : text(source.url, `${sourceField}.url`);
        if (url) {
          try {
            if (!["http:", "https:"].includes(new URL(url).protocol))
              throw new Error();
          } catch {
            throw new Error(`${sourceField}.url phải là URL http/https hợp lệ`);
          }
        }
        if (source.name && source.label && source.name !== source.label)
          throw new Error(`${sourceField}.name và label không được khác nhau`);
        return {
          url,
          label: text(source.name ?? source.label, `${sourceField}.name`),
        };
      },
    );
    const facts = nullable(item.facts, `${field}.facts`);
    const needsReview =
      !facts ||
      item.impact === "unknown" ||
      !sources.some((source) => source.url);
    if (needsReview)
      warnings.push(
        `${field}: thiếu facts/URL nguồn hoặc impact unknown; xem dữ liệu gốc.`,
      );
    return {
      title,
      facts,
      sources,
      needsReview,
      domain: nullable(item.domain, `${field}.domain`),
      category: nullable(item.category, `${field}.category`),
      analysis: nullable(item.analysis, `${field}.analysis`),
      recommendation: nullable(item.recommendation, `${field}.recommendation`),
      impact: item.impact as string,
      raw: JSON.stringify(item),
    };
  });
  if (!summary)
    warnings.push("daily_summary là null; không tự suy diễn tóm tắt.");
  return {
    date,
    summary,
    items,
    warnings,
    signal: nullable(data.biggest_signal, "biggest_signal"),
    model: nullable(data.model_recommendation, "model_recommendation"),
    worthTrying: array(data.worth_trying, "worth_trying").map(
      (value, index): WorthTryingEntry => {
        const field = `worth_trying[${index}]`;
        if (typeof value === "string") return text(value, field);
        const entry = object(value, field);
        return {
          title: text(entry.title, `${field}.title`),
          reason: nullable(entry.reason, `${field}.reason`),
        };
      },
    ),
    needsReview: warnings.length > 0,
    parserVersion: "structured-v1.1",
    importMethod: "Structured Intelligence Data",
  };
}

// Reserved delimiters identify exactly one block; stored raw is never rewritten.
export function readIntelligenceData(
  raw: string,
):
  | { valid: true; parsed: ParsedBrief }
  | { valid: false; error: string }
  | null {
  const starts = [...raw.matchAll(/---INTELLIGENCE-DATA-START---/g)];
  const ends = [...raw.matchAll(/---INTELLIGENCE-DATA-END---/g)];
  if (!starts.length && !ends.length) return null;
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    starts[0].index! >= ends[0].index!
  )
    return {
      valid: false,
      error: "Cần đúng một cặp DATA-START/DATA-END theo đúng thứ tự",
    };
  try {
    const json = raw.slice(
      starts[0].index! + starts[0][0].length,
      ends[0].index!,
    );
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      throw new Error("JSON không hợp lệ giữa DATA-START và DATA-END");
    }
    return { valid: true, parsed: validate(value) };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

export function stripIntelligenceBlocks(raw: string) {
  return raw
    .replace(
      /---INTELLIGENCE-DATA-START---[\s\S]*?(?:---INTELLIGENCE-DATA-END---|$)/g,
      "",
    )
    .replaceAll(DATA_END, "");
}
