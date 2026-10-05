import Link from "next/link";
import { db } from "@/lib/db";
import { listBriefs } from "@/lib/repository";
export const dynamic = "force-dynamic";
export default async function Timeline() {
  const rows = await listBriefs(db);
  return (
    <>
      <div className="eyebrow">Kho bản tin</div>
      <h1>Lịch sử</h1>
      <p className="intro">Đọc lại từng ngày. Nhìn xa hơn từng tin.</p>
      <div className="timeline">
        {rows.map((b) => (
          <Link href={"/timeline/" + b.id} key={b.id}>
            <time>{b.date}</time>
            <div>
              <h2>
                {b.summary?.split("\n")[0] || "Daily Brief — đã lưu bản gốc"}
              </h2>
              <span>
                {b.needsReview ? "Cần kiểm tra" : "Đã nhận diện cấu trúc"} · Xem
                bản tin
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
