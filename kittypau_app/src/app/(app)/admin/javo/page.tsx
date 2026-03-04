"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "@/lib/auth/token";

type JavoProject = {
  id: string;
  name: string;
  area: "bridge" | "firmware" | "app" | "docs";
  summary: string;
  status: "activo" | "en evaluacion" | "referencia";
  hasApp: boolean;
  hasCamera: boolean;
  hasHtml: boolean;
  sourcePaths: string[];
  progress: string[];
  nextSteps: string[];
};

const JAVO_REPO_URL = "https://github.com/javo-mauro/kittypau_1a";

const JAVO_PROJECTS: JavoProject[] = [
  {
    id: "kpcl0036-1b",
    name: "KPCL0036 1b (pack integrado)",
    area: "firmware",
    summary: "Paquete completo con bridge, firmware ESP32-CAM/ESP8266 y migraciones SQL del lote 1b.",
    status: "en evaluacion",
    hasApp: false,
    hasCamera: true,
    hasHtml: false,
    sourcePaths: [
      "kittypau_iot_firmware/6 _KPCL0036_1b/bridge/bridge.js",
      "kittypau_iot_firmware/6 _KPCL0036_1b/firmware-esp32cam/platformio.ini",
      "kittypau_iot_firmware/6 _KPCL0036_1b/firmware-esp8266/platformio.ini",
      "kittypau_iot_firmware/6 _KPCL0036_1b/SQL_UNIFICADO.sql",
    ],
    progress: [
      "Snapshot técnico completo del lote KPCL0036 con componentes IoT clave.",
      "Incluye variantes de migración SQL para consolidación de esquema.",
      "Contiene manuales e hitos operativos para revisión de compatibilidad.",
    ],
    nextSteps: [
      "Comparar SQL_UNIFICADO con migraciones oficiales de Supabase antes de merge.",
      "Unificar solo módulos validados para evitar duplicidad de bridge y firmware.",
    ],
  },
  {
    id: "bridge-v2-4",
    name: "Bridge v2.4",
    area: "bridge",
    summary: "Servicio Node.js para telemetría, heartbeat y sincronización de estado de dispositivos.",
    status: "activo",
    hasApp: false,
    hasCamera: false,
    hasHtml: false,
    sourcePaths: [
      "iot_firmware/javier_1a/bridge_v2_4/bridge.js",
      "iot_firmware/javier_1a/bridge_v2_4/package.json",
      "iot_firmware/javier_1a/bridge_v2_4/supabase_schema.sql",
    ],
    progress: [
      "Arquitectura directa bridge -> Supabase documentada.",
      "Heartbeat y estado de bridge consolidados en flujo operativo.",
      "Esquema SQL de soporte disponible como referencia técnica.",
    ],
    nextSteps: [
      "Alinear métricas y naming con módulos productivos de kittypau_app.",
      "Definir rama de integración para convergencia final de bridge.",
    ],
  },
  {
    id: "firmware-esp32-cam",
    name: "Firmware ESP32-CAM",
    area: "firmware",
    summary: "Firmware IoT para sensores + cámara con conectividad WiFi/MQTT.",
    status: "activo",
    hasApp: false,
    hasCamera: true,
    hasHtml: false,
    sourcePaths: [
      "iot_firmware/javier_1a/firmware-esp32cam/platformio.ini",
      "iot_firmware/javier_1a/firmware-esp32cam/src/camera_manager.cpp",
      "iot_firmware/javier_1a/firmware-esp32cam/src/main.cpp",
    ],
    progress: [
      "Integración de cámara embebida disponible en módulo dedicado.",
      "Base de conectividad MQTT y administración WiFi implementada.",
      "Estructura lista para flasheo y pruebas con PlatformIO.",
    ],
    nextSteps: [
      "Completar matriz E2E en flujo app + bridge + cámara.",
      "Normalizar reporting de estado para panel admin.",
    ],
  },
  {
    id: "firmware-esp8266",
    name: "Firmware ESP8266",
    area: "firmware",
    summary: "Firmware para dispositivos KPCL con sensores, WiFi y telemetría MQTT.",
    status: "activo",
    hasApp: false,
    hasCamera: false,
    hasHtml: false,
    sourcePaths: [
      "iot_firmware/javier_1a/firmware-esp8266/platformio.ini",
      "iot_firmware/javier_1a/firmware-esp8266/src/main.cpp",
      "iot_firmware/javier_1a/firmware-esp8266/src/mqtt_manager.cpp",
    ],
    progress: [
      "Pipeline de conexión WiFi + MQTT disponible.",
      "Módulos de sensores y señalización LED organizados por responsabilidad.",
      "Base funcional para lotes de validación con dispositivos de prueba.",
    ],
    nextSteps: [
      "Cerrar checklist de compatibilidad con modelo de datos actual.",
      "Ajustar umbrales de salud y alarmas en monitoreo central.",
    ],
  },
  {
    id: "kittypau-app-legacy",
    name: "Kittypau App (referencia Javier)",
    area: "app",
    summary: "Snapshot de app Next.js en repo de Javier para contraste funcional.",
    status: "referencia",
    hasApp: true,
    hasCamera: false,
    hasHtml: false,
    sourcePaths: [
      "kittypau_iot_firmware/kittypau-app/README.md",
      "kittypau_iot_firmware/kittypau-app/app",
      "kittypau_iot_firmware/kittypau-app/public",
    ],
    progress: [
      "Repositorio de referencia disponible para comparar flujos UI/API.",
      "Útil para rescatar componentes o decisiones previas.",
    ],
    nextSteps: [
      "Tomar solo piezas necesarias y versionarlas por PR en app principal.",
      "Evitar mezclar código legacy sin validación de seguridad y build.",
    ],
  },
  {
    id: "docs-operacionales-javo",
    name: "Documentación Operacional Javo",
    area: "docs",
    summary: "Manuales y bitácoras para operación, hitos y tópicos del stack IoT.",
    status: "en evaluacion",
    hasApp: false,
    hasCamera: false,
    hasHtml: false,
    sourcePaths: [
      "iot_firmware/javier_1a/MANUAL_USUARIO_javier.md",
      "iot_firmware/javier_1a/Hitos-Pendientes_javier.md",
      "iot_firmware/javier_1a/Topicos_javier.md",
    ],
    progress: [
      "Base documental para onboarding técnico de trabajo IoT.",
      "Hitos y pendientes identificados para priorización conjunta.",
    ],
    nextSteps: [
      "Sincronizar bitácora con Docs/AVANCE_PUSHES_GITHUB.md.",
      "Mantener trazabilidad mensual de fusión Mauro/Javo.",
    ],
  },
];

function badgeColor(status: JavoProject["status"]) {
  if (status === "activo") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "en evaluacion") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function boolPill(value: boolean) {
  return value
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-500";
}

export default function AdminJavoPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(JAVO_PROJECTS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const validateAdmin = async () => {
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
        if (!accessRes.ok) {
          router.replace("/today");
          return;
        }
        if (mounted) {
          setError(null);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("No se pudo validar acceso admin para módulo Javo.");
          setLoading(false);
        }
      }
    };

    validateAdmin().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [router]);

  const selected = useMemo(
    () => JAVO_PROJECTS.find((project) => project.id === selectedId) ?? JAVO_PROJECTS[0],
    [selectedId]
  );

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[55vh] w-full max-w-6xl items-center justify-center px-4 py-6">
        <div className="surface-card freeform-rise w-full max-w-md px-5 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin Javo</p>
          <h1 className="display-title mt-1 text-2xl font-semibold text-slate-900">Cargando proyectos</h1>
          <p className="mt-2 text-sm text-slate-500">Validando acceso y preparando vista de integración.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <section className="surface-card freeform-rise px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kittypau / Admin / Javo</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="display-title text-2xl font-semibold text-slate-900 sm:text-3xl">
              Proyectos de Javier integrados en Kittypau
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Referencia principal: <span className="font-semibold text-slate-700">javo-mauro/kittypau_1a</span>
            </p>
          </div>
          <a
            href={JAVO_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
          >
            Abrir repo referencia
          </a>
        </div>
        {error ? (
          <p className="mt-4 rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="surface-card freeform-rise px-4 py-4 sm:px-5">
          <h2 className="display-title text-xl font-semibold text-slate-900">Listado de proyectos Javo</h2>
          <p className="mt-1 text-xs text-slate-500">Selecciona un proyecto para ver su estado y trazabilidad.</p>
          <div className="mt-4 grid gap-2">
            {JAVO_PROJECTS.map((project) => {
              const isActive = selected.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`rounded-[var(--radius)] border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-300 bg-slate-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeColor(
                        project.status
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{project.summary}</p>
                </button>
              );
            })}
          </div>
        </article>

        <article className="surface-card freeform-rise px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display-title text-xl font-semibold text-slate-900">{selected.name}</h2>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeColor(
                selected.status
              )}`}
            >
              {selected.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{selected.summary}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className={`rounded-[var(--radius)] border px-3 py-2 text-xs ${boolPill(selected.hasApp)}`}>
              App vinculada: {selected.hasApp ? "Si" : "No"}
            </div>
            <div className={`rounded-[var(--radius)] border px-3 py-2 text-xs ${boolPill(selected.hasCamera)}`}>
              Camara vinculada: {selected.hasCamera ? "Si" : "No"}
            </div>
            <div className={`rounded-[var(--radius)] border px-3 py-2 text-xs ${boolPill(selected.hasHtml)}`}>
              Archivos HTML: {selected.hasHtml ? "Si" : "No detectados"}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Avances observados</h3>
              <ul className="mt-2 space-y-2">
                {selected.progress.map((item) => (
                  <li key={item} className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Siguientes pasos</h3>
              <ul className="mt-2 space-y-2">
                {selected.nextSteps.map((item) => (
                  <li key={item} className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rutas fuente revisadas</h3>
            <div className="mt-2 grid gap-2">
              {selected.sourcePaths.map((path) => (
                <code
                  key={path}
                  className="block rounded-[var(--radius)] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                >
                  {path}
                </code>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
