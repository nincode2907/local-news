"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>Chưa mở được nhật ký</h1>
      <p>
        Không đọc được database. Kiểm tra kết nối mạng, cấu hình Turso và chạy
        npm run db:migrate.
      </p>
      <button className="button" onClick={reset}>
        Thử lại
      </button>
    </div>
  );
}
