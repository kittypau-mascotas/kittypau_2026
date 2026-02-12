"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";

const navItems = [
  { href: "/today", label: "Hoy" },
  { href: "/story", label: "Story" },
  { href: "/pet", label: "Mascota" },
  { href: "/bowl", label: "Plato" },
];

export default function AppNav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    user_name?: string | null;
    owner_name?: string | null;
    photo_url?: string | null;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  if (pathname?.startsWith("/onboarding")) {
    return null;
  }

  if (pathname?.startsWith("/admin")) {
    return (
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-brand">
            <span className="brand-title">MODO ADMIN</span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearTokens();
              window.location.href = "/login";
            }}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    );
  }

  useEffect(() => {
    let isMounted = true;
    getValidAccessToken().then((token) => {
      if (!token || !isMounted) return;
      fetch("/api/profiles", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          const data = payload?.data ?? payload;
          if (isMounted && data?.id) {
            setProfile({
              user_name: data.user_name,
              owner_name: data.owner_name,
              photo_url: data.photo_url,
            });
          }
        })
        .catch(() => undefined);

      fetch("/api/admin/overview?audit_limit=1", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!isMounted) return;
          setIsAdmin(res.ok);
        })
        .catch(() => {
          if (isMounted) setIsAdmin(false);
        });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <img src="/logo.jpg" alt="Kittypau" className="brand-mark" />
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
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            Ajustes
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-10 mt-2 w-56 rounded-[var(--radius)] border border-slate-200 bg-white p-2 shadow-lg"
              role="menu"
            >
              <Link
                href="/settings"
                className="block rounded-[calc(var(--radius)-6px)] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Ajustes
              </Link>
              <Link
                href="/pet"
                className="mt-1 block rounded-[calc(var(--radius)-6px)] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Editar perfil
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="mt-1 block rounded-[calc(var(--radius)-6px)] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  clearTokens();
                  window.location.href = "/login";
                }}
                className="mt-1 block w-full rounded-[calc(var(--radius)-6px)] border border-rose-200 bg-rose-50 px-3 py-2 text-left text-xs font-semibold text-rose-700"
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
        {profile ? (
          <div className="app-nav-user">
            <img
              src={profile.photo_url || "/avatar_1.png"}
              alt="Avatar"
              className="app-nav-avatar"
            />
            <span className="app-nav-user-name">
              {profile.owner_name || profile.user_name || "Kittypau"}
            </span>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
