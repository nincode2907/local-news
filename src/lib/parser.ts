export type ParsedItem = {
  title: string;
  domain: string | null;
  category: string | null;
  facts: string | null;
  analysis: string | null;
  recommendation: string | null;
  impact: string;
  raw: string;
  needsReview: boolean;
  sources: { url: string; label: string }[];
};
export type ParsedBrief = {
  date: string | null;
  summary: string | null;
  signal: string | null;
  model: string | null;
  items: ParsedItem[];
  warnings: string[];
  needsReview: boolean;
  parserVersion: string;
};
const aliases: Record<string, string> = {
  summary: "summary",
  "tóm tắt": "summary",
  "biggest signal": "signal",
  "biggest signal/trend": "signal",
  trend: "signal",
  "tín hiệu lớn nhất": "signal",
  "model recommendation": "model",
  "gợi ý model": "model",
  fact: "facts",
  facts: "facts",
  "sự kiện": "facts",
  analysis: "analysis",
  "analysis / why it matters": "analysis",
  "why it matters": "analysis",
  "phân tích": "analysis",
  recommendation: "recommendation",
  "khuyến nghị": "recommendation",
  domain: "domain",
  "lĩnh vực": "domain",
  category: "category",
  "chuyên mục": "category",
  impact: "impact",
  "tác động": "impact",
  sources: "sources",
  source: "sources",
  nguồn: "sources",
  date: "date",
  ngày: "date",
};
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function parseBrief(raw: string): ParsedBrief {
  if (!raw.trim())
    throw new Error("Bản tin trống. Hãy dán Markdown trước khi xem trước.");
  if (raw.length > 500000)
    throw new Error("Bản tin quá lớn (tối đa 500.000 ký tự).");
  if (raw.trim().length < 30 || raw.includes("\u0000"))
    throw new Error("Nội dung không hợp lệ. Hãy dán một Daily Brief đầy đủ.");
  const warnings: string[] = [];
  const global: Record<string, string> = {};
  const blocks: { title: string; lines: string[] }[] = [];
  let block: (typeof blocks)[number] | null = null;
  let field: string | null = null;
  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    const clean = (heading ? heading[1] : line)
      .replace(/^\s*[-*]\s+/, "")
      .replace(/\*\*/g, "")
      .trim();
    const label = clean.match(/^([^:：]+)[:：]\s*(.*)$/);
    const key = aliases[(label ? label[1] : clean).toLowerCase()];
    if (heading && key && ["summary", "signal", "model"].includes(key)) {
      block = null;
      field = key;
      if (label?.[2]) global[key] = label[2];
      continue;
    }
    if (
      heading &&
      !key &&
      (heading[0].startsWith("### ") || /^\d+[.)]\s/.test(clean))
    ) {
      block = { title: clean.replace(/^\d+[.)]\s*/, ""), lines: [] };
      blocks.push(block);
      field = null;
      continue;
    }
    if (block) {
      block.lines.push(line);
      continue;
    }
    if (label && key) {
      field = key;
      global[key] = label[2];
      continue;
    }
    if (heading) {
      field = null;
      continue;
    }
    if (field && line.trim())
      global[field] = [global[field], line].filter(Boolean).join("\n");
  }
  let date =
    global.date?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ??
    raw.match(/^#(?!#)\s+.*?\b(\d{4}-\d{2}-\d{2})\b/m)?.[1] ??
    null;
  if (date && !validDate(date)) {
    warnings.push("Ngày trong nội dung không hợp lệ.");
    date = null;
  }
  if (!date)
    warnings.push("Không xác định được ngày ISO; hãy chọn ngày của bản tin.");
  const parsedItems = blocks.map((b) => {
    const data: Record<string, string> = {};
    let current: string | null = null;
    let unrecognized = false;
    for (const line of b.lines) {
      const clean = line
        .replace(/^\s*[-*]\s+/, "")
        .replace(/\*\*/g, "")
        .replace(/^#{1,6}\s+/, "")
        .trim();
      const m = clean.match(/^([^:：]+)[:：]\s*(.*)$/);
      const key = aliases[(m ? m[1] : clean).toLowerCase()];
      if (key) {
        current = key;
        data[key] = [data[key], m?.[2]].filter(Boolean).join("\n");
      } else if (current) {
        data[current] = [data[current], line].filter(Boolean).join("\n").trim();
      } else if (clean) unrecognized = true;
    }
    const sourceList: { url: string; label: string }[] = [];
    const sourceText = data.sources ?? "";
    for (const m of sourceText.matchAll(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g,
    )) {
      const url = (m[2] ?? m[3]).replace(/[.,;]+$/, "");
      try {
        new URL(url);
        if (!sourceList.some((s) => s.url === url))
          sourceList.push({ url, label: m[1] ?? new URL(url).hostname });
      } catch {
        unrecognized = true;
      }
    }
    const impactMap: Record<string, string> = {
      high: "high",
      medium: "medium",
      low: "low",
      cao: "high",
      "trung bình": "medium",
      thấp: "low",
    };
    const impact =
      impactMap[(data.impact ?? "").trim().toLowerCase()] ?? "unknown";
    const needsReview =
      unrecognized ||
      !data.facts ||
      impact === "unknown" ||
      !sourceList.length ||
      Object.keys(data).some((k) =>
        ["summary", "signal", "model", "date"].includes(k),
      );
    if (needsReview)
      warnings.push(
        `“${b.title}”: thiếu trường rõ ràng hoặc có nội dung chưa nhận diện; xem bản gốc.`,
      );
    return {
      title: b.title,
      domain: data.domain || null,
      category: data.category || null,
      facts: data.facts || null,
      analysis: data.analysis || null,
      recommendation: data.recommendation || null,
      impact,
      raw: b.lines.join("\n"),
      needsReview,
      sources: sourceList,
    };
  });
  if (!parsedItems.length)
    warnings.push(
      "Không nhận diện được tin. Bản gốc vẫn được lưu. Dùng ### cho tiêu đề từng tin.",
    );
  if (!global.summary)
    warnings.push("Không nhận diện được phần tóm tắt; không tự suy diễn.");
  return {
    date,
    summary: global.summary || null,
    signal: global.signal || null,
    model: global.model || null,
    items: parsedItems,
    warnings,
    needsReview: warnings.length > 0,
    parserVersion: "rules-v1",
  };
}
