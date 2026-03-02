"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "@/lib/auth/token";

type JavoProject = {
  id: string;
  name: string;
  status: "integrado" | "en_revision";
  summary: string;
  artifacts: string[];
};

const JAVO_PROJECTS: JavoProject[] = [
  {
    id: "bridge-v2-4",
    name: "Bridge v2.4 (IoT)",
    status: "integrado",
    summary:
      "Implementacion de bridge MQTT con telemetria, heartbeat y ciclo de estado de dispositivos.",
    artifacts: [
      "iot_firmware/javier_1a/bridge_v2_4/bridge.js",
      "iot_firmware/javier_1a/bridge_v2_4/supabase_schema.sql",
    ],
  },
  {
    id: "firmware-esp32cam",
    name: "Firmware ESP32-CAM",
    status: "integrado",
    summary:
      "Firmware para lectura de sensores, conectividad WiFi y publicacion MQTT en topicos KPCL.",
    artifacts: [
      "iot_firmware/javier_1a/firmware-esp32cam/platformio.ini",
      "iot_firmware/javier_1a/firmware-esp32cam/src/main.cpp",
    ],
  },
  {
    id: "firmware-esp8266",
    name: "Firmware ESP8266",
    status: "integrado",
    summary:
      "Firmware alternativo para dispositivos de pruebas con manejo de sensores y envio MQTT.",
    artifacts: [
      "iot_firmware/javier_1a/firmware-esp8266/platformio.ini",
      "iot_firmware/javier_1a/firmware-esp8266/src/main.cpp",
    ],
  },
  {
    id: "unificacion-bridge",
    name: "Unificacion bridge productivo",
    status: "en_revision",
    summary:
      "Comparacion tecnica entre bridge v2.4 y bridge actual de app para consolidar una sola version productiva.",
    artifacts: [
      "bridge/src/index.js",
      "Docs/INTEGRACION_JAVIER_IOT.md",
      "Docs/PLAYBOOK_INGRESO_IOT_FIRMWARE.md",
    ],
  },
];

export default function AdminJavoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const validateAccess = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          router.replace("/login");
          return;
        }

        const accessRes = await fetch("/api/admin/access", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const accountRes = await fetch("/api/account/type", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const adminPayload = (accessRes.ok
          ? await accessRes.json().catch(() => null)
          : null) as { is_admin?: boolean } | null;

        const accountPayload = (accountRes.ok
          ? await accountRes.json().catch(() => null)
          : null) as { account_type?: "admin" | "tester" | "client" } | null;

        const isTester = accountPayload?.account_type === "tester";
        const isAdmin = Boolean(adminPayload?.is_admin);

        if (!isAdmin && !isTester) {
          router.replace("/today");
          return;
        }
        if (active) setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo validar acceso admin.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void validateAccess();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Cargando módulo Javo...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,242,242,0.6),_rgba(248,250,252,1))] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-rose-700">Módulo Javo</h1>
          <p className="mt-2 text-sm text-rose-600">{error}</p>
          <Link
            href="/admin"
            className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver al dashboard admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Javo · Proyectos Reales</h1>
          <p className="mt-2 text-sm text-slate-600">
            Espacio admin para revisar los desarrollos IoT/Firmware de Javier ya incorporados a
            KittyPaw.
          </p>
        </header>

        <div className="grid gap-4">
          {JAVO_PROJECTS.map((project) => (
            <article key={project.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    project.status === "integrado"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {project.status === "integrado" ? "Integrado" : "En revisión"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.artifacts.map((artifact) => (
                  <code
                    key={`${project.id}-${artifact}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                  >
                    {artifact}
                  </code>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Siguiente paso</h2>
          <p className="mt-2 text-sm text-slate-600">
            Unificar bridge actual y bridge v2.4 con pruebas E2E y validación de contrato MQTT/API
            antes de promover a producción.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver al dashboard admin
            </Link>
            <Link
              href="/today"
              className="inline-flex rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Ir a la app
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
