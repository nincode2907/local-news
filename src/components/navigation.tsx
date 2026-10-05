"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Search,
  Plus,
  ArrowUpRight,
} from "lucide-react";
export function Navigation() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <BookOpen size={23} />
        <span>
          Intelligence<small>NHẬT KÝ NGHIÊN CỨU CÁ NHÂN</small>
        </span>
      </Link>
      <div className="nav-label">Nhật ký</div>
      <nav>
        {[
          { href: "/", label: "Hôm nay", icon: BookOpen },
          { href: "/timeline", label: "Lịch sử", icon: CalendarDays },
          { href: "/search", label: "Tìm kiếm", icon: Search },
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={
              (n.href === "/" ? path === "/" : path.startsWith(n.href))
                ? "active"
                : ""
            }
          >
            <n.icon size={18} />
            {n.label}
            {(n.href === "/" ? path === "/" : path.startsWith(n.href)) && (
              <span className="nav-dot" />
            )}
          </Link>
        ))}
      </nav>
      <Link className="import-link" href="/import">
        <Plus size={18} />
        Nhập Daily Brief
      </Link>
      <div className="sidebar-bottom">
        <span className="status-dot" /> Nhật ký cá nhân{" "}
        <ArrowUpRight size={14} />
        <small>Mỗi sáng, một bản tin.</small>
      </div>
    </aside>
  );
}
