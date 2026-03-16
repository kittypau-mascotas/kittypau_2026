"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SocialLinks from "@/app/_components/social-links";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { useAppData } from "@/lib/context/app-context";
import { isNativeFlavorEnabled } from "@/lib/runtime/app-flavor";

type NavItem = {
  href: string;
  label: string;
  demoMenu?: "today" | "story" | "pet" | "bowl";
};

const specialNavItems: NavItem[] = [
  { href: "/today", label: "Hoy" },
  { href: "/story", label: "Story" },
  { href: "/pet", label: "Mascota" },
  { href: "/bowl", label: "Plato" },
];

const demoNavItems: NavItem[] = [
  { href: "/demo?menu=today", label: "Hoy", demoMenu: "today" },
  { href: "/demo?menu=story", label: "Story", demoMenu: "story" },
  { href: "/demo?menu=pet", label: "Mascota", demoMenu: "pet" },
  { href: "/demo?menu=bowl", label: "Plato", demoMenu: "bowl" },
];

const clientNavItems: NavItem[] = [{ href: "/inicio", label: "Inicio" }];

export default function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, petName, devices, accountType, isAdmin } = useAppData();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoOwnerName, setDemoOwnerName] = useState<string | null>(null);
  const [demoPetName, setDemoPetName] = useState<string | null>(null);
  const [demoDeviceId, setDemoDeviceId] = useState<string | null>(null);
  const [navPetName, setNavPetName] = useState<string | null>(null);
  const [userSelectedDeviceId, setUserSelectedDeviceId] = useState<
    string | null
  >(null);
  const selectedDeviceId = useMemo(() => {
    if (userSelectedDeviceId !== null) return userSelectedDeviceId;
    if (devices.length === 0) return null;
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("kittypau_device_id")
        : null;
    return (devices.find((d) => d.id === stored) ?? devices[0])?.id ?? null;
  }, [userSelectedDeviceId, devices]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [adminRole, setAdminRole] = useState<string>("owner_admin");
  const [adminGeneratedAt, setAdminGeneratedAt] = useState<string | null>(null);
  const [adminFreshnessLabel, setAdminFreshnessLabel] = useState(
    "Actualizado recientemente",
  );
  const [isNativeApkMode] = useState<boolean>(() => {
    if (isNativeFlavorEnabled()) return true;
    if (typeof window === "undefined") return false;
    const cap = (window as Window & { Capacitor?: unknown }).Capacitor as
      | {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
        }
      | undefined;
    if (!cap) return false;
    return (
      (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) ||
      (typeof cap.getPlatform === "function" && cap.getPlatform() !== "web")
    );
  });

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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const syncDemo = () => {
      if (typeof window === "undefined") return;
      const enabled =
        pathname?.startsWith("/demo") &&
        window.localStorage.getItem("kittypau_demo_mode") === "1";
      setIsDemoMode(enabled);
      if (!enabled) {
        setDemoOwnerName(null);
        setDemoPetName(null);
        setDemoDeviceId(null);
        return;
      }
      setDemoOwnerName(window.localStorage.getItem("kittypau_demo_owner_name"));
      setDemoPetName(window.localStorage.getItem("kittypau_demo_pet_name"));
      setDemoDeviceId(
        window.localStorage.getItem("kittypau_demo_device_id") || "KPCL-DEMO",
      );
    };

    syncDemo();
    window.addEventListener("storage", syncDemo);
    return () => {
      window.removeEventListener("storage", syncDemo);
    };
  }, [pathname]);

  useEffect(() => {
    const syncFromStorage = () => {
      if (typeof window === "undefined") return;
      const storedPetName = window.localStorage.getItem("kittypau_pet_name");
      const storedDeviceId = window.localStorage.getItem("kittypau_device_id");
      if (storedPetName) setNavPetName(storedPetName);
      if (storedDeviceId) setUserSelectedDeviceId(storedDeviceId);
      if (isDemoMode) {
        const demoPet = window.localStorage.getItem("kittypau_demo_pet_name");
        const demoDevice =
          window.localStorage.getItem("kittypau_demo_device_id") || "KPCL-DEMO";
        if (demoPet) setNavPetName(demoPet);
        setDemoDeviceId(demoDevice);
      }
    };

    const onPetChange = (event: Event) => {
      const custom = event as CustomEvent<{ petName?: string }>;
      if (custom.detail?.petName) setNavPetName(custom.detail.petName);
      else syncFromStorage();
    };

    const onDeviceChange = (event: Event) => {
      const custom = event as CustomEvent<{ deviceId?: string }>;
      if (custom.detail?.deviceId) setUserSelectedDeviceId(custom.detail.deviceId);
      else syncFromStorage();
    };

    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("kittypau-pet-change", onPetChange as EventListener);
    window.addEventListener(
      "kittypau-device-change",
      onDeviceChange as EventListener,
    );
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(
        "kittypau-pet-change",
        onPetChange as EventListener,
      );
      window.removeEventListener(
        "kittypau-device-change",
        onDeviceChange as EventListener,
      );
    };
  }, [isDemoMode]);

  if (pathname?.startsWith("/registro")) {
    return null;
  }

  if (pathname?.startsWith("/admin")) {
    const isAdminHome = pathname === "/admin";
    const isJavoSection = pathname?.startsWith("/admin/javo");

    return (
      <nav className="app-nav app-nav-top app-nav-admin-mode">
        <div className="app-nav-inner app-nav-inner-admin">
          <div className="app-nav-brand">
            <span className="brand-title">MODO ADMIN</span>
          </div>
          <div className="app-nav-admin-actions">
            <Link
              href="/admin"
              className={`app-nav-admin-pill app-nav-admin-link ${
                isAdminHome
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/javo"
              className={`app-nav-admin-pill app-nav-admin-link ${
                isJavoSection
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : ""
              }`}
            >
              Javo
            </Link>
            <span className="app-nav-admin-pill">Rol: {adminRole}</span>
            <span className="app-nav-admin-pill">{adminFreshnessLabel}</span>
            <span className="app-nav-admin-pill">Auto refresh: 5 min</span>
            <Link
              href="/inicio"
              className="app-nav-admin-pill app-nav-admin-link"
            >
              Vista cliente
            </Link>
            <button
              type="button"
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="kp-brand-soft-action rounded-full px-3 py-2 text-xs font-semibold"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>
    );
  }

  const effectiveAccountType = isDemoMode ? "tester" : accountType;
  const isSpecial =
    effectiveAccountType === "admin" || effectiveAccountType === "tester";
  const useSidebarNav =
    !isNativeApkMode &&
    (effectiveAccountType === "tester" || effectiveAccountType === "client");
  const demoMenu = (searchParams.get("menu") ?? "today") as
    | "today"
    | "story"
    | "pet"
    | "bowl";
  const navItems = isDemoMode
    ? demoNavItems
    : isSpecial
      ? specialNavItems
      : clientNavItems;
  const resolvedDeviceLabel = isDemoMode
    ? demoDeviceId || "KPCL-DEMO"
    : selectedDeviceId
      ? devices.find((d) => d.id === selectedDeviceId)?.device_id ?? ""
      : "";
  const userSummary = (
    <div className="app-nav-user app-nav-user-static">
      <Image
        src={profile?.photo_url || "/avatar_1.png"}
        alt="Avatar"
        width={38}
        height={38}
        className="app-nav-avatar"
      />
      <span className="app-nav-user-meta">
        <span className="app-nav-user-name">
          {demoOwnerName || profile?.owner_name || profile?.user_name || "Kittypau"}
          {effectiveAccountType === "admin"
            ? " - Admin"
            : effectiveAccountType === "tester"
              ? isDemoMode
                ? " - Prueba"
                : " - Tester"
              : ""}
        </span>
        <span className="app-nav-user-sub">
          {demoPetName ?? navPetName ?? petName ?? "Sin mascota"}
          {resolvedDeviceLabel ? ` - ${resolvedDeviceLabel}` : ""}
        </span>
      </span>
    </div>
  );
  const accountActions = (
    <>
      {isSpecial ? (
        <>
          <Link
            href="/settings"
            className="kp-nav-action flex items-center gap-2 rounded-[calc(var(--radius)-6px)] px-3 py-2.5 text-sm font-semibold"
            onClick={() => setMenuOpen(false)}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 text-inherit"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.2 1.2a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.2A1.2 1.2 0 0 1 13.8 21h-1.6A1.2 1.2 0 0 1 11 19.8v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0L6.3 17.8a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.2A1.2 1.2 0 0 1 4.3 13v-1.6A1.2 1.2 0 0 1 5.5 10h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.2-1.2a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .5-.9V4.5A1.2 1.2 0 0 1 12.2 3.3h1.6A1.2 1.2 0 0 1 15 4.5v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.2 1.2a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.5h.2a1.2 1.2 0 0 1 1.2 1.2V13a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.6Z" />
            </svg>
            Ajustes
          </Link>
          <Link
            href="/pet"
            className="kp-nav-action mt-1 flex items-center gap-2 rounded-[calc(var(--radius)-6px)] px-3 py-2.5 text-sm font-semibold"
            onClick={() => setMenuOpen(false)}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 text-inherit"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
            Editar perfil
          </Link>
        </>
      ) : null}
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
        className="kp-brand-soft-action mt-1 block w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs font-semibold"
      >
        Cerrar sesión
      </button>
    </>
  );

  return (
    <nav
      className={`app-nav app-nav-main-mode ${useSidebarNav ? "app-nav-sidebar" : "app-nav-top"}`}
    >
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="app-nav-logo-wrap" aria-hidden="true">
            <Image
              src="/logo_carga.jpg"
              alt="Kittypau"
              width={44}
              height={44}
              className="brand-mark app-nav-logo"
            />
          </span>
          <span className="app-nav-brand-stack text-center">
            <span className="brand-title app-nav-brand-title">Kittypau</span>
            <span className="app-nav-brand-subtitle kp-pettech-tagline block text-center">
              PetTech AIoT
            </span>
          </span>
        </div>
        {useSidebarNav ? (
          <div className="app-nav-social-top">
            <SocialLinks size="sm" />
          </div>
        ) : null}
        {useSidebarNav ? <div className="app-nav-user-top">{userSummary}</div> : null}
        <div className="app-nav-links">
          {navItems.map((item) => {
            const isActive = isDemoMode
              ? pathname?.startsWith("/demo") && item.demoMenu === demoMenu
              : pathname === item.href ||
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
        {useSidebarNav ? (
          <div className="app-nav-links-extra">{accountActions}</div>
        ) : null}

        {!useSidebarNav ? (
          <div ref={menuRef} className="relative app-nav-profile-menu">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="app-nav-user-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {userSummary}
            </button>
            {menuOpen ? (
              <div className="app-nav-menu" role="menu">
                {accountActions}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="app-nav-contact">
          <span className="text-center">Kittypau · IoT Chile S.A</span>
          <span className="kp-pettech-tagline">
            PetTech AIoT
          </span>
          <a href="mailto:kittypau.mascotas@gmail.com">
            kittypau.mascotas@gmail.com
          </a>
        </div>
      </div>
    </nav>
  );
}


