import { db } from "@/lib/db";
import { getBrief } from "@/lib/repository";
import { BriefView } from "@/components/brief-view";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Today() {
  const brief = await getBrief(db);
  return brief ? (
    <BriefView brief={brief} />
  ) : (
    <div className="empty">
      <div className="eyebrow">Bắt đầu nhật ký của bạn</div>
      <h1>Lưu lại điều đáng chú ý.</h1>
      <p>Nhập Daily Brief đầu tiên để bắt đầu lịch sử đọc của bạn.</p>
      <Link className="button" href="/import">
        Nhập Daily Brief
      </Link>
    </div>
  );
}
