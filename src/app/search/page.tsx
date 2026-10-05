import { impactLabels, fieldLabels } from "@/lib/labels";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { searchItems } from "@/lib/repository";
import { NewsCard } from "@/components/news-card";
export const dynamic = "force-dynamic";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const f: Record<string, string> = {};
  for (const k of ["q", "date", "domain", "category", "impact"])
    f[k] = typeof params[k] === "string" ? (params[k] as string) : "";
  const rows = await searchItems(db, f);
  const facets = await db
    .select({ domain: items.domain, category: items.category })
    .from(items);
  return (
    <>
      <div className="eyebrow">Tìm lại thông tin</div>
      <h1>Tìm trong nhật ký</h1>
      <p className="intro">Đọc lại sự kiện, phân tích và khuyến nghị.</p>
      <form className="search-form">
        <label className="query">
          Từ khóa
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Tìm trong tiêu đề, sự kiện, phân tích hoặc khuyến nghị…"
          />
        </label>
        <div className="filters">
          <label>
            Ngày
            <input type="date" name="date" defaultValue={f.date} />
          </label>
          {(["domain", "category"] as const).map((k) => (
            <label key={k}>
              {fieldLabels[k]}
              <select aria-label={fieldLabels[k]} name={k} defaultValue={f[k]}>
                <option value="">Tất cả {fieldLabels[k].toLowerCase()}</option>
                {[...new Set(facets.map((r) => r[k]).filter(Boolean))]
                  .sort()
                  .map((v) => (
                    <option key={v} value={v!}>
                      {v}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <label>
            Tác động
            <select aria-label="Tác động" name="impact" defaultValue={f.impact}>
              <option value="">Tất cả mức tác động</option>
              {["high", "medium", "low", "unknown"].map((v) => (
                <option key={v} value={v}>
                  {impactLabels[v]}
                </option>
              ))}
            </select>
          </label>
          <button className="button">Tìm kiếm</button>
          <a href="/search">Xóa bộ lọc</a>
        </div>
      </form>
      <div className="section-label">
        <span>{rows.length} kết quả</span>
        <span>Mới nhất trước</span>
      </div>
      <div className="news-list">
        {rows.map((i) => (
          <NewsCard key={i.id} item={i} />
        ))}
      </div>
      {!rows.length && (
        <p>Không tìm thấy tin phù hợp. Thử đổi từ khóa hoặc xóa bộ lọc.</p>
      )}
    </>
  );
}
