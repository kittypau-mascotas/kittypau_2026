"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth/token";

const navItems = [
  { href: "/today", label: "Hoy" },
  { href: "/story", label: "Story" },
  { href: "/pet", label: "Mascota" },
  { href: "/bowl", label: "Plato" },
  { href: "/settings", label: "Ajustes" },
];

export default function AppNav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    user_name?: string | null;
    owner_name?: string | null;
    photo_url?: string | null;
  } | null>(null);

  if (pathname?.startsWith("/onboarding")) {
    return null;
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let isMounted = true;
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
