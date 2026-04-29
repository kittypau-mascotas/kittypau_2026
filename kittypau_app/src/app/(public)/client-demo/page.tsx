"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientDemoPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Client demo is a lightweight, unauthenticated preview built on top of the existing demo flow.
    window.localStorage.setItem("kittypau_demo_mode", "1");
    window.localStorage.setItem("kittypau_demo_owner_name", "Cliente Demo");
    window.localStorage.setItem("kittypau_demo_pet_name", "Michi Cliente");
    window.localStorage.setItem("kittypau_demo_device_id", "KPCL-DEMO");
    window.localStorage.setItem("kittypau_demo_show_rpg", "0");
    window.localStorage.setItem("kittypau_demo_kind", "client");
    window.localStorage.removeItem("kittypau_demo_pet_type");
    window.localStorage.removeItem("kittypau_demo_email");
    window.localStorage.removeItem("kittypau_demo_source");
    window.localStorage.removeItem("kittypau_demo_recorded_at");

    router.replace("/demo?menu=today");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-100">
      <div className="text-sm font-semibold">Preparando vista cliente…</div>
      <div className="mt-1 text-xs text-slate-300">
        Redirigiendo a preview sin login.
      </div>
    </div>
  );
}
