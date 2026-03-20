"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";

type AdminHeaderMeta = {
  hasToken: boolean;
  isAdmin: boolean;
  role: string | null;
  generatedAt: string | null;
};

async function fetchAdminHeaderMeta(): Promise<AdminHeaderMeta> {
  const token = await getValidAccessToken();
  if (!token) {
    return { hasToken: false, isAdmin: false, role: null, generatedAt: null };
  }

  const [accessRes, overviewRes] = await Promise.all([
    fetch("/api/admin/access", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch("/api/admin/overview?scope=lite&audit_limit=1", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  const accessJson = accessRes.ok
    ? await accessRes.json().catch(() => null)
    : null;
  const overviewJson = overviewRes.ok
    ? await overviewRes.json().catch(() => null)
    : null;

  return {
    hasToken: true,
    isAdmin: Boolean(accessJson?.is_admin),
    role: accessJson?.role ?? null,
    generatedAt: overviewJson?.summary?.generated_at ?? null,
  };
}

export default function AdminHeader() {
  const router = useRouter();
  const [meta, setMeta] = useState<AdminHeaderMeta>({
    hasToken: true,
    isAdmin: true,
    role: "owner_admin",
    generatedAt: null,
  });

  useEffect(() => {
    let active = true;
    const sync = () =>
      fetchAdminHeaderMeta()
        .then((next) => {
          if (active) setMeta(next);
        })
        .catch(() => undefined);

    sync();
    const interval = window.setInterval(sync, 300_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const updatedLabel = useMemo(() => {
    if (!meta.generatedAt) return new Date().toLocaleString();
    const ts = Date.parse(meta.generatedAt);
    if (!Number.isFinite(ts)) return new Date().toLocaleString();
    return new Date(ts).toLocaleString();
  }, [meta.generatedAt]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-[220px]">
        <div className="text-xs font-semibold tracking-wide text-slate-200">
          MODO ADMIN
        </div>
        <div className="mt-1 text-[11px] text-slate-300">
          Rol: {meta.role ?? "—"} · Actualizado: {updatedLabel} · Auto refresh:
          5 min
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!meta.hasToken ? (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
          >
            Iniciar sesión
          </button>
        ) : null}
        <Link
          href="/test"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
        >
          Vista Test
        </Link>
        <Link
          href="/client-demo"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
        >
          Vista Cliente
        </Link>
        <button
          type="button"
          onClick={() => {
            clearTokens();
            router.replace("/login");
          }}
          className="rounded-full bg-red-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
