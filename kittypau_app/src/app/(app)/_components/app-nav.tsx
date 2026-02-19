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
  const [adminRole, setAdminRole] = useState<string>("owner_admin");
  const [adminGeneratedAt, setAdminGeneratedAt] = useState<string | null>(null);
  const [adminFreshnessLabel, setAdminFreshnessLabel] = useState("Actualizado recientemente");
  const [adminNocMode, setAdminNocMode] = useState(true);
  const [adminCompactDensity, setAdminCompactDensity] = useState(false);
  const [adminInfraExpanded, setAdminInfraExpanded] = useState(false);

  if (pathname?.startsWith("/registro")) {
    return null;
  }

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
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

      fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!isMounted) return;
          if (!res.ok) {
            setIsAdmin(false);
            return;
          }
          const payload = await res.json().catch(() => null);
          setIsAdmin(Boolean(payload?.is_admin));
        })
        .catch(() => {
          if (isMounted) setIsAdmin(false);
        });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) return;
    let active = true;

    const readBool = (key: string, fallback: boolean) => {
      if (typeof window === "undefined") return fallback;
      const raw = window.localStorage.getItem(key);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return fallback;
    };

    setAdminNocMode(readBool("admin_ui_noc_mode", true));
    setAdminCompactDensity(readBool("admin_ui_density_compact", false));
    setAdminInfraExpanded(readBool("admin_ui_infra_expanded", false));

    const formatFreshness = (isoValue: string | null) => {
      if (!isoValue) return "Actualizado recientemente";
      const ms = Date.now() - Date.parse(isoValue);
      if (!Number.isFinite(ms) || ms < 0) return "Actualizado recientemente";
      const sec = Math.floor(ms / 1000);
      if (sec < 60) return `Actualizado hace ${sec}s`;
      const min = Math.floor(sec / 60);
      return `Actualizado hace ${min}m`;
    };

    const syncAdmin = async () => {
      const token = await getValidAccessToken();
      if (!token || !active) return;

      const roleRes = await fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (roleRes.ok && active) {
        const rolePayload = await roleRes.json().catch(() => null);
        setAdminRole(rolePayload?.role ?? "owner_admin");
      }

      const overviewRes = await fetch("/api/admin/overview?audit_limit=1", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (overviewRes.ok && active) {
        const overviewPayload = await overviewRes.json().catch(() => null);
        const generatedAt = overviewPayload?.summary?.generated_at ?? null;
        setAdminGeneratedAt(generatedAt);
        setAdminFreshnessLabel(formatFreshness(generatedAt));
      }
    };

    syncAdmin().catch(() => undefined);
    const interval = window.setInterval(() => {
      setAdminFreshnessLabel(formatFreshness(adminGeneratedAt));
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pathname, adminGeneratedAt]);

  const setAdminPreference = (key: string, value: boolean) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, String(value));
      window.dispatchEvent(
        new CustomEvent("admin-ui-settings-changed", {
          detail: { key, value },
        })
      );
    }
  };

  if (pathname?.startsWith("/admin")) {
    return (
      <nav className="app-nav">
        <div className="app-nav-inner app-nav-inner-admin">
          <div className="app-nav-brand">
            <span className="brand-title">MODO ADMIN</span>
          </div>
          <div className="app-nav-admin-actions">
            <span className="app-nav-admin-pill">Rol: {adminRole}</span>
            <span className="app-nav-admin-pill">{adminFreshnessLabel}</span>
            <span className="app-nav-admin-pill">Auto refresh: 5 min</span>
            <Link href="/today" className="app-nav-admin-pill app-nav-admin-link">
              Volver a la app
            </Link>
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
            <button
              type="button"
              className="app-nav-admin-pill app-nav-admin-toggle"
              onClick={() => {
                const next = !adminNocMode;
                setAdminNocMode(next);
                setAdminPreference("admin_ui_noc_mode", next);
              }}
            >
              Modo NOC: {adminNocMode ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              className="app-nav-admin-pill app-nav-admin-toggle"
              onClick={() => {
                const next = !adminCompactDensity;
                setAdminCompactDensity(next);
                setAdminPreference("admin_ui_density_compact", next);
              }}
            >
              Densidad: {adminCompactDensity ? "Compacta" : "Normal"}
            </button>
            <button
              type="button"
              className="app-nav-admin-pill app-nav-admin-toggle"
              onClick={() => {
                const next = !adminInfraExpanded;
                setAdminInfraExpanded(next);
                setAdminPreference("admin_ui_infra_expanded", next);
              }}
            >
              Infra: {adminInfraExpanded ? "Visible" : "Colapsada"}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="app-nav-logo-wrap" aria-hidden="true">
            <img src="/logo_2.png" alt="Kittypau" className="brand-mark app-nav-logo" />
          </span>
          <span className="brand-title app-nav-brand-title">Kittypau</span>
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

        <div className="relative app-nav-profile-menu">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="app-nav-user app-nav-user-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <img
              src={profile?.photo_url || "/avatar_1.png"}
              alt="Avatar"
              className="app-nav-avatar"
            />
            <span className="app-nav-user-name">
              {profile?.owner_name || profile?.user_name || "Kittypau"}
            </span>
          </button>

          {menuOpen ? (
            <div className="app-nav-menu" role="menu">
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
      </div>
    </nav>
  );
}
