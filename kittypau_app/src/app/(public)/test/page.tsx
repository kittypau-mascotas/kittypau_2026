"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TestModePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = useMemo(
    () => (searchParams.get("mode") ?? "demo").trim(),
    [searchParams],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Demo/test mode is intentionally unauthenticated and client-side only.
    window.localStorage.setItem("kittypau_demo_mode", "1");
    window.localStorage.setItem("kittypau_demo_owner_name", "Test Mode");
    window.localStorage.setItem("kittypau_demo_pet_name", "Mishi Demo");
    window.localStorage.setItem("kittypau_demo_device_id", "KPCL-DEMO");
    window.localStorage.setItem("kittypau_demo_show_rpg", "1");
    window.localStorage.setItem("kittypau_demo_kind", mode);
    window.localStorage.removeItem("kittypau_demo_pet_type");
    window.localStorage.removeItem("kittypau_demo_email");
    window.localStorage.removeItem("kittypau_demo_source");
    window.localStorage.removeItem("kittypau_demo_recorded_at");

    router.replace("/demo?menu=today");
  }, [mode, router]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-100">
      <div className="text-sm font-semibold">Activando modo test…</div>
      <div className="mt-1 text-xs text-slate-300">
        Redirigiendo a vista demo sin autenticación.
      </div>
    </div>
  );
}
