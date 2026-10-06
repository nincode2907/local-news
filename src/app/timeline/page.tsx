import Link from "next/link";
import { db } from "@/lib/db";
import { listBriefs } from "@/lib/repository";
import { items, sources } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";
export default async function Timeline() {
  const rows = await listBriefs(db);
  const metadata = await db
    .select({
      briefId: items.briefId,
      itemCount: sql<number>`count(distinct ${items.id})`.mapWith(Number),
      sourceCount: sql<number>`count(${sources.id})`.mapWith(Number),
    })
    .from(items)
    .leftJoin(sources, eq(sources.itemId, items.id))
    .groupBy(items.briefId);
  const counts = new Map(metadata.map((entry) => [entry.briefId, entry]));
  return (
    <>
      <div className="eyebrow">Kho bản tin</div>
      <h1>Lịch sử</h1>
      <p className="intro">Đọc lại từng ngày. Nhìn xa hơn từng tin.</p>
      <div className="timeline">
        {rows.map((b) => (
          <Link href={"/timeline/" + b.id} key={b.id}>
            <time dateTime={b.date}>{b.date}</time>
            <div>
              <h2>{b.summary?.split("\n")[0] || "Bản tin — đã lưu bản gốc"}</h2>
              <span className="timeline-meta">
                <span>{counts.get(b.id)?.itemCount ?? 0} tin</span>
                <span>{counts.get(b.id)?.sourceCount ?? 0} nguồn</span>
                <span className={b.needsReview ? "review" : undefined}>
                  {b.needsReview ? "Cần kiểm tra" : "Không có cảnh báo"}
                </span>
              </span>
            </div>
            <span>↗</span>
          </Link>
        ))}
      </div>
      {!rows.length && (
        <p>
          Chưa có bản tin. <Link href="/import">Nhập bản tin đầu tiên →</Link>
        </p>
      )}
    </>
  );
}
