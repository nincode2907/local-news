import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Không tìm thấy bản tin</h1>
      <p>Đường dẫn này không có trong nhật ký.</p>
      <Link className="button" href="/timeline">
        Mở lịch sử bản tin
      </Link>
    </div>
  );
}
