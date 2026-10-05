import { impactLabels } from "@/lib/labels";
import { Markdown } from "./markdown";
import { NewsCard } from "./news-card";
import type { getBrief } from "@/lib/repository";
export function BriefView({
  brief,
  detail = false,
}: {
  brief: NonNullable<Awaited<ReturnType<typeof getBrief>>>;
  detail?: boolean;
}) {
  const counts = brief.items.reduce<Record<string, number>>((a, i) => {
    a[i.impact] = (a[i.impact] || 0) + 1;
    return a;
  }, {});
  return (
    <>
      <div className="eyebrow">
        {detail ? "Lịch sử / Daily Brief" : "Bản tin dành cho hôm nay"}{" "}
        <span>• {brief.date}</span>
      </div>
      <div className="heading-row">
        <h1>{detail ? "Daily Brief" : "Điểm tin hôm nay"}</h1>
        <span className="edition">{brief.items.length} tin</span>
      </div>
      <section className="overview">
        <div className="summary">
          <h3>Tóm tắt</h3>
          <Markdown>{brief.summary}</Markdown>
        </div>
        <aside>
          <h3>Mức độ tác động</h3>
          <div className="counts">
            {["high", "medium", "low", "unknown"].map((k) => (
              <div key={k}>
                <strong>{counts[k] || 0}</strong>
                <span>{impactLabels[k]}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
      {(brief.signal || brief.model) && (
        <div className="signals">
          {brief.signal && (
            <section>
              <h3>Tín hiệu / Xu hướng nổi bật</h3>
              <Markdown>{brief.signal}</Markdown>
            </section>
          )}
          {brief.model && (
            <section>
              <h3>Gợi ý model</h3>
              <Markdown>{brief.model}</Markdown>
            </section>
          )}
        </div>
      )}
      {brief.needsReview && (
        <details className="review notice">
          <summary>Cần kiểm tra · {brief.warnings.length} lưu ý</summary>
          <ul>
            {brief.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="section-label">
        <span>Các tin trong ngày</span>
        <span>{brief.date}</span>
      </div>
      <div className="news-list">
        {brief.items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
      <details className="raw">
        <summary>Xem Markdown gốc · được giữ nguyên</summary>
        <pre>{brief.raw}</pre>
      </details>
    </>
  );
}
