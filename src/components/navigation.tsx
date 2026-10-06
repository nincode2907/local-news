"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Search, Plus } from "lucide-react";
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
      <nav aria-label="Nhật ký">
        {[
          { href: "/", label: "Hôm nay", icon: BookOpen },
          { href: "/timeline", label: "Lịch sử", icon: CalendarDays },
          { href: "/search", label: "Tìm kiếm", icon: Search },
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={
              (n.href === "/" ? path === "/" : path.startsWith(n.href))
                ? "page"
                : undefined
            }
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
      <Link
        className="import-link"
        href="/import"
        aria-current={path === "/import" ? "page" : undefined}
      >
        <Plus size={18} />
        Nhập bản tin
      </Link>
      <div className="sidebar-bottom">
        <span className="status-dot" /> Nhật ký cá nhân{" "}
        <small>Mỗi sáng, một bản tin.</small>
      </div>
    </aside>
  );
}
