"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TodayScreen from "@/app/(app)/today/_components/today-screen";
import DemoNav from "./_components/demo-nav";
import { createDemoFetch } from "@/lib/demo/demo-fetch";
import {
  clearDemoIdentity,
  readDemoIdentity,
  writeDemoIdentity,
  type DemoIdentity,
  type DemoPetType,
} from "@/lib/demo-identity";

// Demo pública de una sola vista (Knowledge/29_Specs/009-demo-today-en-vivo):
// espeja `/today` de la mascota de demo con datos reales EN VIVO, reemplazando
// solo la identidad visible por la del visitante. Es EL MISMO <TodayScreen> de
// la app -- cualquier cambio a `/today` aparece acá sin editar la demo (FR-016).

const PET_TYPES: { type: DemoPetType; label: string; src: string }[] = [
  { type: "dog", label: "Perro", src: "/illustrations/nervous-not.gif" },
  { type: "cat", label: "Gato", src: "/illustrations/giphy.gif" },
];

const INTRO_SEEN_KEY = "kittypau_demo_intro_seen";

function introSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

// Lead best-effort para /admin/demo-ingresos (spec 009 US3). Sin email --
// se dedupea por visitor_id. No bloquea la entrada a la demo si falla.
function recordDemoIngreso(identity: DemoIdentity) {
  const payload = JSON.stringify({
    visitor_id: identity.visitorId,
    owner_name: identity.ownerName,
    pet_name: identity.petName,
    pet_type: identity.petType,
    source: "demo_app",
  });
  try {
    if (
      navigator.sendBeacon?.(
        "/api/demo/ingreso",
        new Blob([payload], { type: "application/json" }),
      )
    ) {
      return;
    }
  } catch {
    /* cae al fetch */
  }
  void fetch("/api/demo/ingreso", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => null);
}

export default function DemoPage() {
  const router = useRouter();
  // Un solo state para la lectura de localStorage al montar -- SSR no puede
  // leerlo, así que se hace en efecto y hasta entonces no se renderiza nada
  // (evita mismatch de hidratación).
  const [boot, setBoot] = useState<{
    ready: boolean;
    identity: DemoIdentity | null;
  }>({ ready: false, identity: null });
  const { ready, identity } = boot;

  // Pop-up de "datos reales" -- se muestra una vez por sesión de navegador,
  // apenas se entra a /demo (pedido de Mauro).
  const [showIntro, setShowIntro] = useState(false);

  // Form
  const [ownerName, setOwnerName] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<DemoPetType>("dog");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de storage al montar
    setBoot({ ready: true, identity: readDemoIdentity() });
    if (!introSeen()) setShowIntro(true);
  }, []);

  const dismissIntro = () => {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* incógnito -- se ignora */
    }
    setShowIntro(false);
  };

  const canEnter = ownerName.trim().length > 0 && petName.trim().length > 0;

  const enterDemo = () => {
    if (!canEnter) {
      setError(
        !ownerName.trim()
          ? "Escribe tu nombre para continuar."
          : "Escribe el nombre de tu mascota para continuar.",
      );
      return;
    }
    setError(null);
    const next = writeDemoIdentity({
      ownerName,
      petName,
      petType,
      source: "demo_app",
    });
    recordDemoIngreso(next);
    setBoot({ ready: true, identity: next });
  };

  const cancel = () => {
    clearDemoIdentity();
    router.push("/login");
  };

  // El fetch de demo depende de la identidad (nombre/tipo del visitante van en
  // los shapes sintéticos de pets/profiles). Memoizado -> <TodayScreen> estable.
  const demoFetch = useMemo(
    () => (identity ? createDemoFetch(identity) : null),
    [identity],
  );

  if (!ready) return null;

  const introModal = showIntro ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-slate-200 bg-white p-5 text-center shadow-[0_30px_70px_-30px_rgba(15,23,42,0.5)]">
        <p className="brand-title text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-primary">
          Datos 100% reales
        </p>
        <h2 className="mt-2 text-base font-semibold text-slate-900">
          Esto no es una simulación
        </h2>
        <p className="mt-2 text-[0.83rem] leading-relaxed text-slate-600">
          Lo que vas a ver son los datos en vivo del comedero y el bebedero de
          un gato real, funcionando de forma continua desde abril de 2026.
        </p>
        <button
          type="button"
          onClick={dismissIntro}
          className="mt-4 w-full rounded-[var(--radius)] bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
        >
          Ver la demo
        </button>
      </div>
    </div>
  ) : null;

  if (identity && demoFetch) {
    return (
      <>
        {introModal}
        <div className="app-shell">
          <DemoNav
            identity={identity}
            onCreateAccount={() => router.push("/login?register=1")}
          />
          <div className="app-content">
            <TodayScreen
              mode="demo"
              fetchImpl={demoFetch}
              identity={identity}
            />
          </div>
        </div>
      </>
    );
  }

  // Form "Personaliza tu demo"
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      {introModal}
      <div className="w-full max-w-md rounded-[var(--radius)] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] sm:p-6">
        <p className="brand-title text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-primary">
          Modo prueba
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          Personaliza tu demo
        </h1>
        <p className="mt-1 text-[0.8rem] text-slate-500">
          Vas a ver el producto real funcionando en vivo, con el nombre de tu
          mascota adentro. No pedimos tu correo todavía.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-slate-500">
              ¿Cuál es tu mascota?
            </span>
            <div className="flex gap-4">
              {PET_TYPES.map((opt) => {
                const selected = petType === opt.type;
                return (
                  <div
                    key={opt.type}
                    className="flex flex-col items-center gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => setPetType(opt.type)}
                      aria-pressed={selected}
                      aria-label={opt.label}
                      className={`flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full border-2 bg-white transition ${
                        selected
                          ? "border-emerald-500 shadow-[0_12px_30px_-16px_rgba(34,197,94,0.4)]"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={opt.src}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <span className="text-[0.82rem] font-semibold text-slate-700">
                      {opt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-slate-500">
              Tu nombre
            </span>
            <input
              type="text"
              value={ownerName}
              maxLength={120}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-9 w-full rounded-[var(--radius)] border border-slate-200 px-3 text-[0.82rem] outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-slate-500">
              Nombre de tu mascota
            </span>
            <input
              type="text"
              value={petName}
              maxLength={120}
              onChange={(e) => setPetName(e.target.value)}
              className="h-9 w-full rounded-[var(--radius)] border border-slate-200 px-3 text-[0.82rem] outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enterDemo}
            disabled={!canEnter}
            className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Entrar a prueba
          </button>
        </div>
      </div>
    </div>
  );
}
