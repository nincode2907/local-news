import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
export const metadata: Metadata = {
  title: "Intelligence — Nhật ký nghiên cứu",
  description: "Nhật ký cá nhân về tín hiệu, sự kiện và quyết định.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Navigation />
        <main>
          {children}
          <footer className="page-footer">
            Intelligence{" "}
            <span>Ghi lại góc nhìn về một thế giới đang thay đổi.</span>
          </footer>
        </main>
      </body>
    </html>
  );
}
