"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/app/(app)/_components/app-nav";
import { AppDataProvider } from "@/lib/context/app-context";

export default function DemoPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("Invitado");
  const [petName, setPetName] = useState("Tu mascota");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDemo = window.localStorage.getItem("kittypau_demo_mode") === "1";
    if (!isDemo) {
      router.replace("/login");
      return;
    }
    const owner = window.localStorage.getItem("kittypau_demo_owner_name");
    const pet = window.localStorage.getItem("kittypau_demo_pet_name");
    if (owner) setOwnerName(owner);
    if (pet) setPetName(pet);
  }, [router]);

  const updatedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );

  const exitDemo = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("kittypau_demo_mode");
      window.localStorage.removeItem("kittypau_demo_owner_name");
      window.localStorage.removeItem("kittypau_demo_pet_name");
      window.localStorage.removeItem("kittypau_demo_device_id");
    }
    router.push("/login");
  };

  return (
    <AppDataProvider>
      <div className="app-shell">
        <AppNav />
        <div className="app-content">
          <main className="min-h-screen px-4 py-4 md:px-6">
            <section className="mx-auto mt-1 w-full max-w-6xl rounded-[var(--radius)] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.4)] md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src="/pet_profile.jpeg"
                    alt={`Foto de ${petName}`}
                    width={96}
                    height={96}
                    className="rounded-full border border-slate-200 object-cover"
                  />
                  <div>
                    <h1 className="text-3xl font-semibold text-slate-900">{petName}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Perro · Demo · small · adult · 0 kg
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Titular: {ownerName}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Actualizado el {updatedAtLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[10px] border border-rose-100 bg-rose-50/50 px-3 py-2">
                      <p className="text-xs font-semibold text-rose-700">Alimentacion</p>
                      <p className="mt-1 text-xs text-slate-600">2 veces/dia</p>
                      <p className="text-xs text-slate-600">Consumo: 190 g /dia</p>
                    </div>
                    <div className="rounded-[10px] border border-rose-100 bg-rose-50/50 px-3 py-2">
                      <p className="text-xs font-semibold text-rose-700">Hidratacion</p>
                      <p className="mt-1 text-xs text-slate-600">4 veces/dia</p>
                      <p className="text-xs text-slate-600">Consumo: 280 ml /dia</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-[var(--radius)] border border-slate-200/80 bg-white px-4 py-3 md:px-6">
              <p className="text-sm text-slate-600">
                Esta es una vista de demostracion personalizada para explorar Kittypau.
              </p>
              <button
                type="button"
                onClick={exitDemo}
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Salir de prueba
              </button>
            </section>
          </main>
        </div>
      </div>
    </AppDataProvider>
  );
}
