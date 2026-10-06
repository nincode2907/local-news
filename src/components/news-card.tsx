import { impactLabels } from "@/lib/labels";
import { Markdown } from "./markdown";
import type { ParsedItem } from "@/lib/parser";
export function NewsCard({
  item,
}: {
  item: Omit<ParsedItem, "raw"> & {
    id?: string;
    date?: string;
    briefId?: string;
  };
}) {
  return (
    <article className="news-card">
      <div className="card-meta">
        <span>
          {item.domain || "Chưa phân loại"} /{" "}
          {item.category || "Chưa phân loại"}
        </span>
        <span className={"impact " + item.impact}>
          Tác động: {impactLabels[item.impact]}
        </span>
      </div>
      <h2>{item.title}</h2>
      {item.date && (
        <a className="date-link" href={"/timeline/" + item.briefId}>
          {item.date} · Xem bản tin ↗
        </a>
      )}
      {item.needsReview && (
        <p className="review">Cần kiểm tra · đối chiếu bản gốc</p>
      )}
      <div className="card-content">
        <section>
          <h3>Sự kiện</h3>
          <Markdown>{item.facts}</Markdown>
        </section>
        <section>
          <h3>Phân tích / Vì sao đáng chú ý</h3>
          <Markdown>{item.analysis}</Markdown>
        </section>
        <section className="recommendation">
          <h3>Khuyến nghị</h3>
          <Markdown>{item.recommendation}</Markdown>
        </section>
      </div>
      <footer>
        <span>Nguồn</span>
        {item.sources.length ? (
          item.sources.map((s, index) =>
            s.url ? (
              <a
                key={`${s.url}-${index}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.label} ↗
              </a>
            ) : (
              <span key={`${s.label}-${index}`} className="muted">
                {s.label}
              </span>
            ),
          )
        ) : (
          <span className="muted">Không có nguồn nhận diện được</span>
        )}
      </footer>
    </article>
  );
}
