"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

type AdminNavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/devices", label: "Devices" },
  { href: "/admin/pets", label: "Pets" },
  { href: "/admin/alerts", label: "Alerts" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref = useMemo(() => {
    const match = NAV_ITEMS.find((item) => pathname === item.href);
    return match?.href ?? null;
  }, [pathname]);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="text-xs font-semibold tracking-wide text-slate-200">
          MODO ADMIN
        </div>
        <div className="mt-1 text-[11px] text-slate-300">
          Panel modular + rutas independientes
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => router.prefetch(item.href)}
              className={
                "rounded-xl px-3 py-2 text-sm font-medium transition " +
                (isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/admin/legacy"
          onMouseEnter={() => router.prefetch("/admin/legacy")}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          Vista legacy
        </Link>
      </div>
    </div>
  );
}
