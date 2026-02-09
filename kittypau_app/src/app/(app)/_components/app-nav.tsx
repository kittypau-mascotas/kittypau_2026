"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/today", label: "Hoy" },
  { href: "/story", label: "Story" },
  { href: "/pet", label: "Mascota" },
  { href: "/bowl", label: "Plato" },
  { href: "/settings", label: "Ajustes" },
];

export default function AppNav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/onboarding")) {
    return null;
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="brand-title">Kittypau</span>
          <span className="app-nav-dot" />
          <span className="app-nav-subtle">IoT</span>
        </div>
        <div className="app-nav-links">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/today" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link ${isActive ? "is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
