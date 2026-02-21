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
    email?: string | null;
  } | null>(null);
  const [petName, setPetName] = useState<string | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; device_id: string; pet_id?: string | null }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<"admin" | "tester" | "client">(
    "client"
  );
  const [adminRole, setAdminRole] = useState<string>("owner_admin");
  const [adminGeneratedAt, setAdminGeneratedAt] = useState<string | null>(null);
  const [adminFreshnessLabel, setAdminFreshnessLabel] = useState("Actualizado recientemente");

  if (pathname?.startsWith("/registro")) {
    return null;
  }

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let isMounted = true;
    getValidAccessToken().then((token) => {
      if (!token || !isMounted) return;
      Promise.all([
        fetch("/api/profiles", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/pets?limit=20", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/devices?limit=20", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/account/type", { headers: { Authorization: `Bearer ${token}` } }),
      ])
        .then(async ([profileRes, petsRes, devicesRes, accountRes]) => {
          const profilePayload = profileRes.ok ? await profileRes.json().catch(() => null) : null;
          const petsPayload = petsRes.ok ? await petsRes.json().catch(() => null) : null;
          const devicesPayload = devicesRes.ok ? await devicesRes.json().catch(() => null) : null;
          const accountPayload = accountRes.ok ? await accountRes.json().catch(() => null) : null;
          if (!isMounted) return;
          const profileData = profilePayload?.data ?? profilePayload;
          if (profileData?.id) {
            setProfile({
              user_name: profileData.user_name,
              owner_name: profileData.owner_name,
              photo_url: profileData.photo_url,
              email: profileData.email,
            });
          }
          const pets = Array.isArray(petsPayload?.data)
            ? petsPayload.data
            : Array.isArray(petsPayload)
            ? petsPayload
            : [];
          const nextDevices = Array.isArray(devicesPayload?.data)
            ? devicesPayload.data
            : Array.isArray(devicesPayload)
            ? devicesPayload
            : [];
          setPetName(pets[0]?.name ?? null);
          setDevices(nextDevices);
          const stored =
            typeof window !== "undefined" ? window.localStorage.getItem("kittypau_device_id") : null;
          const primary = nextDevices.find((d: { id: string }) => d.id === stored) ?? nextDevices[0] ?? null;
          setSelectedDeviceId(primary?.id ?? null);
          setIsAdmin(Boolean(accountPayload?.is_admin));
          setAccountType(
            accountPayload?.account_type === "admin" ||
              accountPayload?.account_type === "tester"
              ? accountPayload.account_type
              : "client"
          );
        })
        .catch(() => undefined);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) return;
    let active = true;

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
          </div>
        </div>
      </nav>
    );
  }

  const isTester = accountType === "tester";
  const isSpecial = accountType === "admin" || accountType === "tester";

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="app-nav-logo-wrap" aria-hidden="true">
            <img src="/logo.jpg" alt="Kittypau" className="brand-mark app-nav-logo" />
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
            <span className="app-nav-user-meta">
              <span className="app-nav-user-name">
                {profile?.owner_name || profile?.user_name || "Kittypau"}
                {accountType === "admin"
                  ? " · Admin"
                  : accountType === "tester"
                  ? " · Tester"
                  : ""}
              </span>
              <span className="app-nav-user-sub">
                {petName ?? "Sin mascota"}
                {selectedDeviceId
                  ? ` · ${devices.find((d) => d.id === selectedDeviceId)?.device_id ?? ""}`
                  : ""}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div className="app-nav-menu" role="menu">
              {isSpecial ? (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Cuenta especial: {accountType === "admin" ? "Admin" : "Tester"}
                </p>
              ) : null}
              {devices.length > 1 ? (
                <div className="px-2 pb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Dispositivo
                    <select
                      className="mt-1 block w-full rounded-[var(--radius)] border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600"
                      value={selectedDeviceId ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value || null;
                        setSelectedDeviceId(nextId);
                        if (nextId && typeof window !== "undefined") {
                          window.localStorage.setItem("kittypau_device_id", nextId);
                          window.dispatchEvent(
                            new CustomEvent("kittypau-device-change", { detail: { deviceId: nextId } })
                          );
                        }
                      }}
                    >
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.device_id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              <Link
                href="/settings"
                className="block rounded-[calc(var(--radius)-6px)] px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen(false)}
              >
                Ajustes
              </Link>
              <Link
                href="/pet"
                className="mt-1 block rounded-[calc(var(--radius)-6px)] px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
