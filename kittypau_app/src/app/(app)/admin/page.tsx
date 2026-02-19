"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import {
  DEFAULT_KPCL_COST_CATALOG,
  has3dPrintForKpcl,
  resolveCatalogKeyByModelAndType,
  type KpclCatalog,
} from "@/lib/finance/kpcl-catalog";

type AdminSummary = {
  generated_at: string;
  kpcl_total_devices: number;
  kpcl_online_devices: number;
  kpcl_offline_devices: number;
  bridge_total: number;
  bridge_active: number;
  bridge_degraded: number;
  bridge_offline: number;
  outages_last_24h: number;
  offline_events_last_24h: number;
};

type AuditEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type AuditFilter = "critical" | "bridge" | "devices" | "outages" | "all";

type AuditGroup = {
  key: string;
  event_type: string;
  entity_type: string | null;
  message: string | null;
  latest_at: string;
  count: number;
  sample: AuditEvent[];
};

type BridgeLive = {
  device_id: string;
  bridge_status: "active" | "degraded" | "offline";
  wifi_ip: string | null;
  hostname: string | null;
  last_seen: string | null;
  kpcl_total_devices: number;
  kpcl_online_devices: number;
  kpcl_offline_devices: number;
};

type KpclDevice = {
  id: string;
  device_id: string;
  device_type: string | null;
  device_model: string | null;
  device_state: string | null;
  status: string | null;
  last_seen: string | null;
  battery_level: number | null;
  owner_id: string | null;
  wifi_status: string | null;
  wifi_ip: string | null;
  sensor_health: string | null;
  is_online: boolean;
};

type KpclHourPoint = {
  ts: number;
  online: boolean | null;
  payload_bytes: number;
};

type KpclDeviceHourlyStatus = {
  device_id: string;
  points: KpclHourPoint[];
};

type KpclTotalsOrigin = {
  device_id: string;
  online_hours_total: number;
  data_mb_total: number;
};

type KpclCatalogPayload = Record<string, KpclCatalog>;

type IncidentCounters = {
  bridge_offline_detected: number;
  device_offline_detected: number;
  general_device_outage_detected: number;
  general_device_outage_recovered: number;
};

type PendingRegistration = {
  id: string;
  user_name: string | null;
  city: string | null;
  user_step: string | null;
  created_at: string;
  stage: "profile_pending" | "pet_pending" | "device_pending" | "completed";
};

type RegistrationSummary = {
  total_profiles: number;
  completed: number;
  pending_total: number;
  pending_profile: number;
  pending_pet: number;
  pending_device: number;
  stalled_24h: number;
  pending_recent: PendingRegistration[];
};

type SupabaseStorageSummary = {
  plan_mb: number;
  used_mb: number;
  used_percent: number;
  db_used_mb: number;
  storage_used_mb: number;
  objects_count: number;
};

type VercelUsageSummary = {
  provider: "vercel";
  team_id: string | null;
  project_id: string | null;
  plan_name: string | null;
  deployments_30d: number | null;
  used_percent: number | null;
  period_start: string | null;
  period_end: string | null;
  source: string;
};

type FinanceSummary = {
  generated_at: string;
  bom_unit_cost_usd: number;
  cloud_monthly_cost_usd: number;
  snapshot_month: string | null;
  units_produced: number;
  total_cost_usd: number;
  unit_cost_usd: number;
};

type FinancePlan = {
  provider: string;
  plan_name: string;
  is_free_plan: boolean;
  is_active: boolean;
  monthly_cost_usd: number;
  limit_label: string | null;
  usage_label: string | null;
  updated_at: string;
};

type DbObjectStat = {
  schema_name: string;
  object_name: string;
  object_type: "table" | "view";
  description: string | null;
  row_estimate: number | null;
  size_bytes: number | null;
  size_pretty: string | null;
  last_updated_at: string | null;
};

type AdminTestResult = {
  id: string;
  name: string;
  status: "pass" | "fail";
  duration_ms: number;
  details: string;
};

type AdminTestRun = {
  status: "passed" | "failed";
  failed_count: number;
  total_count: number;
  results: AdminTestResult[];
  generated_at: string;
};

type AdminTestHistoryItem = {
  id: string;
  event_type: string;
  created_at: string;
  status: string | null;
  failed_count: number | null;
  total_count: number | null;
  results: AdminTestResult[];
};

function formatAgo(value: string) {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "-";
  const diffMs = Date.now() - ts;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `Hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  return `Hace ${diffDay} d`;
}

function eventBadge(eventType: string) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]";

  if (eventType.includes("recovered")) {
    return { label: "Recuperado", className: `${base} border-emerald-200 bg-emerald-50 text-emerald-700` };
  }
  if (eventType.includes("outage")) {
    return { label: "Outage", className: `${base} border-rose-200 bg-rose-50 text-rose-700` };
  }
  if (eventType.includes("offline")) {
    return { label: "Offline", className: `${base} border-amber-200 bg-amber-50 text-amber-800` };
  }
  if (eventType.includes("online")) {
    return { label: "Online", className: `${base} border-emerald-200 bg-emerald-50 text-emerald-700` };
  }
  if (eventType.includes("status_changed")) {
    return { label: "Estado", className: `${base} border-slate-200 bg-white text-slate-600` };
  }
  return { label: "Info", className: `${base} border-slate-200 bg-white text-slate-600` };
}

function formatLastSeenShort(value: string | null) {
  if (!value) return "-";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

const FX_CLP_PER_USD = 950;

const PLA_FILAMENT_PURCHASE = {
  supplier: "VOXEL SYSTEMICS SpA",
  payment_processor: "Mercado Pago",
  source_price_clp: 16000,
  source_weight_grams: 1000,
  product: "Filamento PLA+ eSUN 1.75mm 1Kg",
};

const ADMIN_TEST_CATALOG = [
  {
    id: "admin_dashboard_live",
    name: "Vista admin_dashboard_live",
    source: "API",
    description: "Valida que el resumen operativo principal esté disponible.",
    expected: "Consulta 200 y al menos 1 fila.",
  },
  {
    id: "bridge_status_live",
    name: "Vista bridge_status_live",
    source: "API",
    description: "Revisa estado vivo de bridges (active/degraded/offline).",
    expected: "Consulta exitosa y conteo de bridges.",
  },
  {
    id: "kpcl_devices",
    name: "Inventario KPCL",
    source: "API",
    description: "Verifica acceso a dispositivos KPCL activos.",
    expected: "Conteo de KPCL activos.",
  },
  {
    id: "finance_summary",
    name: "Resumen financiero",
    source: "API",
    description: "Confirma disponibilidad de métricas BOM y cloud mensual.",
    expected: "Fila presente en finance_admin_summary.",
  },
  {
    id: "kpcl_catalog",
    name: "Catálogo KPCL financiero",
    source: "API",
    description: "Valida perfiles y componentes de costo por KPCL.",
    expected: "Perfiles activos y componentes disponibles.",
  },
  {
    id: "db_object_stats",
    name: "Catálogo de tablas/vistas",
    source: "API",
    description: "Verifica estadística de objetos vía vista o RPC fallback.",
    expected: "Listado de objetos con tamaño/rows estimados.",
  },
  {
    id: "ps_test_auth_flow",
    name: "PowerShell: TEST_AUTH_FLOW",
    source: "PS1 · Docs/TEST_AUTH_FLOW.ps1",
    description: "Prueba flujo de autenticación (login, token y acceso protegido).",
    expected: "Token válido y respuestas HTTP esperadas para auth.",
  },
  {
    id: "ps_test_db_api",
    name: "PowerShell: TEST_DB_API",
    source: "PS1 · Docs/TEST_DB_API.ps1",
    description: "Valida endpoints principales de base de datos/API en escenario positivo.",
    expected: "Respuestas 2xx con payload consistente.",
  },
  {
    id: "ps_test_db_api_negative",
    name: "PowerShell: TEST_DB_API_NEGATIVE",
    source: "PS1 · Docs/TEST_DB_API_NEGATIVE.ps1",
    description: "Ejecuta casos negativos para validar control de errores y permisos.",
    expected: "Respuestas de error controladas (4xx/5xx esperadas).",
  },
  {
    id: "ps_test_onboarding_backend",
    name: "PowerShell: TEST_ONBOARDING_BACKEND",
    source: "PS1 · Docs/TEST_ONBOARDING_BACKEND.ps1",
    description: "Prueba flujo backend de onboarding y estados de registro.",
    expected: "Transiciones de estado válidas sin inconsistencias.",
  },
  {
    id: "ps_test_webhook",
    name: "PowerShell: test-webhook",
    source: "PS1 · kittypau_app/scripts/test-webhook.ps1",
    description: "Simula envío de webhook MQTT para validar ingesta y persistencia.",
    expected: "Webhook aceptado y lectura registrada en backend.",
  },
] as const;

function resolveKpclCatalog(
  device: KpclDevice | null,
  catalog: KpclCatalogPayload
): KpclCatalog {
  const key = resolveCatalogKeyByModelAndType(
    device?.device_model ?? null,
    device?.device_type ?? null
  );
  return (
    catalog[key] ??
    DEFAULT_KPCL_COST_CATALOG[key] ??
    DEFAULT_KPCL_COST_CATALOG["generic-kpcl"]
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingStage, setLoadingStage] = useState("Iniciando...");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [bridges, setBridges] = useState<BridgeLive[]>([]);
  const [kpclDevices, setKpclDevices] = useState<KpclDevice[]>([]);
  const [kpclHourlyStatus, setKpclHourlyStatus] = useState<KpclDeviceHourlyStatus[]>([]);
  const [kpclTotalsOrigin, setKpclTotalsOrigin] = useState<KpclTotalsOrigin[]>([]);
  const [incidentCounters, setIncidentCounters] = useState<IncidentCounters | null>(
    null
  );
  const [registrationSummary, setRegistrationSummary] =
    useState<RegistrationSummary | null>(null);
  const [supabaseStorage, setSupabaseStorage] = useState<SupabaseStorageSummary | null>(null);
  const [vercelUsage, setVercelUsage] = useState<VercelUsageSummary | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [financePlans, setFinancePlans] = useState<FinancePlan[]>([]);
  const [dbObjectStats, setDbObjectStats] = useState<DbObjectStat[]>([]);
  const [kpclCatalog, setKpclCatalog] = useState<KpclCatalogPayload>(
    DEFAULT_KPCL_COST_CATALOG
  );
  const [activeGeneralOutage, setActiveGeneralOutage] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("critical");
  const [auditWindowMin, setAuditWindowMin] = useState(60);
  const [groupAudit, setGroupAudit] = useState(true);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [healthCheckStatus, setHealthCheckStatus] = useState<{
    running: boolean;
    lastRunAt: string | null;
    message: string | null;
  }>({
    running: false,
    lastRunAt: null,
    message: null,
  });
  const [historyOffsetHours, setHistoryOffsetHours] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [selectedKpclId, setSelectedKpclId] = useState<string>("");
  const [testsRunning, setTestsRunning] = useState(false);
  const [lastTestRun, setLastTestRun] = useState<AdminTestRun | null>(null);
  const [testHistory, setTestHistory] = useState<AdminTestHistoryItem[]>([]);
  const [testRunnerMessage, setTestRunnerMessage] = useState<string | null>(null);
  const [compactDensity, setCompactDensity] = useState(false);
  const [nocMode, setNocMode] = useState(true);
  const [infraExpanded, setInfraExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setLoadingPercent(8);
          setLoadingStage("Validando sesión...");
        }
        const token = await getValidAccessToken();
        if (!token) {
          throw new Error("Necesitas iniciar sesión.");
        }
        if (mounted) {
          setLoadingPercent(22);
          setLoadingStage("Preparando consulta...");
        }
        const params = new URLSearchParams({
          audit_limit: "60",
          audit_window_min: String(auditWindowMin),
          audit_dedup_sec: "30",
        });
        if (auditFilter === "bridge") params.set("audit_type", "bridge_offline_detected");
        if (auditFilter === "devices") params.set("audit_type", "device_offline_detected");
        if (auditFilter === "outages") params.set("audit_type", "general_device_outage_detected");

        if (mounted) {
          setLoadingPercent(36);
          setLoadingStage("Consultando backend...");
        }
        const res = await fetch(`/api/admin/overview?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 403) {
            router.replace("/today");
            return;
          }
          throw new Error("No se pudo cargar el dashboard admin.");
        }
        if (mounted) {
          setLoadingPercent(72);
          setLoadingStage("Procesando respuesta...");
        }
        const payload = await res.json();
        if (!mounted) return;
        setRole(payload.admin_role ?? null);
        setSummary(payload.summary ?? null);
        const nextEvents = (payload.audit_events ?? []) as AuditEvent[];
        if (auditFilter === "critical") {
          setEvents(
            nextEvents.filter((event) =>
              [
                "bridge_offline_detected",
                "bridge_online_detected",
                "device_offline_detected",
                "device_online_detected",
                "general_device_outage_detected",
                "general_device_outage_recovered",
              ].includes(event.event_type)
            )
          );
        } else {
          setEvents(nextEvents);
        }
        if (mounted) {
          setLoadingPercent(58);
          setLoadingStage("Descargando métricas...");
        }
        setBridges((payload.bridges ?? []) as BridgeLive[]);
        setKpclDevices((payload.kpcl_devices ?? []) as KpclDevice[]);
        const nextDevices = (payload.kpcl_devices ?? []) as KpclDevice[];
        setSelectedKpclId((prev) => prev || nextDevices[0]?.device_id || "");
        setKpclHourlyStatus(
          (payload.kpcl_device_hourly_status ?? []) as KpclDeviceHourlyStatus[]
        );
        setKpclTotalsOrigin(
          (payload.kpcl_totals_origin ?? []) as KpclTotalsOrigin[]
        );
        setIncidentCounters((payload.incident_counters ?? null) as IncidentCounters | null);
        setRegistrationSummary(
          (payload.registration_summary ?? null) as RegistrationSummary | null
        );
        setSupabaseStorage(
          (payload.supabase_storage ?? null) as SupabaseStorageSummary | null
        );
        setVercelUsage((payload.vercel_usage ?? null) as VercelUsageSummary | null);
        setFinanceSummary((payload.finance_summary ?? null) as FinanceSummary | null);
        setFinancePlans((payload.finance_plans ?? []) as FinancePlan[]);
        setDbObjectStats((payload.db_object_stats ?? []) as DbObjectStat[]);
        setKpclCatalog(
          (payload.kpcl_catalog ?? DEFAULT_KPCL_COST_CATALOG) as KpclCatalogPayload
        );
        setActiveGeneralOutage(Boolean(payload.active_general_outage));
        try {
          const testsRes = await fetch("/api/admin/tests/run-all", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (testsRes.ok) {
            const testsPayload = await testsRes.json();
            setTestHistory((testsPayload.history ?? []) as AdminTestHistoryItem[]);
          }
        } catch {
          // Non-blocking: test history is optional on initial dashboard load.
        }
        if (mounted) {
          setLoadingPercent(90);
          setLoadingStage("Aplicando datos en pantalla...");
        }
        setError(null);
        if (mounted) {
          setLoadingPercent(100);
          setLoadingStage("Completado");
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error no controlado.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    const interval = setInterval(load, 300000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [router, auditFilter, auditWindowMin, reloadNonce]);

  const groupedAudit = useMemo((): AuditGroup[] => {
    const map = new Map<string, AuditGroup>();
    for (const event of events) {
      const message =
        typeof event.payload?.message === "string" ? event.payload.message : null;
      const key = `${event.event_type}:${event.entity_type ?? ""}:${message ?? ""}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          event_type: event.event_type,
          entity_type: event.entity_type ?? null,
          message,
          latest_at: event.created_at,
          count: 1,
          sample: [event],
        });
        continue;
      }

      existing.count += 1;
      if (Date.parse(event.created_at) > Date.parse(existing.latest_at)) {
        existing.latest_at = event.created_at;
      }
      if (existing.sample.length < 6) {
        existing.sample.push(event);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => Date.parse(b.latest_at) - Date.parse(a.latest_at)
    );
  }, [events]);

  const criticalAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (!summary) return alerts;
    if (summary.bridge_offline > 0) {
      alerts.push(`${summary.bridge_offline} bridge(s) offline.`);
    }
    if (summary.kpcl_offline_devices > 0) {
      alerts.push(`${summary.kpcl_offline_devices} dispositivo(s) KPCL offline.`);
    }
    if (activeGeneralOutage) {
      alerts.push("Incidente general activo en la red de dispositivos.");
    }
    if ((registrationSummary?.pending_device ?? 0) > 0) {
      alerts.push(
        `${registrationSummary?.pending_device ?? 0} registro(s) con dispositivo pendiente.`
      );
    }
    if ((registrationSummary?.stalled_24h ?? 0) > 0) {
      alerts.push(
        `${registrationSummary?.stalled_24h ?? 0} registro(s) incompletos con más de 24h.`
      );
    }
    const lowBatteryCount = kpclDevices.filter(
      (device) =>
        device.battery_level !== null &&
        device.battery_level !== undefined &&
        device.battery_level <= 5
    ).length;
    if (lowBatteryCount > 0) {
      alerts.push(`${lowBatteryCount} dispositivo(s) KPCL con batería crítica (≤5%).`);
    }
    return alerts;
  }, [summary, activeGeneralOutage, registrationSummary, kpclDevices]);

  const operationStatus = useMemo(() => {
    if (criticalAlerts.length > 0) {
      return {
        label: "Atención",
        tone: "text-rose-700 bg-rose-50 border-rose-200",
        detail: "Hay alertas operativas activas.",
      };
    }
    return {
      label: "Operación estable",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
      detail: "No hay alertas críticas activas.",
    };
  }, [criticalAlerts]);

  const continuityChart = useMemo(() => {
    const rows = kpclHourlyStatus;
    const fallbackHours = 28 * 24;
    const hours = rows[0]?.points?.length ?? fallbackHours;
    const width = 600;
    const left = 86;
    const right = 16;
    const top = 10;
    const rowGap = 18;
    const rowHeight = 10;
    const xWidth = width - left - right;
    const sideInfoWidth = 343;
    const sideGap = 18;
    const plotWidth = Math.max(120, xWidth - sideInfoWidth);
    const windowSpanHours = 1;
    const windowPoints = windowSpanHours + 1;
    const maxOffset = Math.max(0, hours - windowPoints);
    const safeOffset = Math.max(0, Math.min(historyOffsetHours, maxOffset));
    const startIndex = Math.max(0, hours - windowPoints - safeOffset);
    const endIndex = Math.min(hours - 1, startIndex + windowPoints - 1);
    const visibleHours = Math.max(2, endIndex - startIndex + 1);
    const hourWidth = visibleHours > 1 ? plotWidth / (visibleHours - 1) : plotWidth;
    const height = top + Math.max(1, rows.length) * rowGap + 56;
    const referencePoints = rows[0]?.points ?? [];
    const tickStep = 1;
    const xTicks = Array.from({ length: visibleHours }, (_, i) => startIndex + i)
      .filter((idx) => (idx - startIndex) % tickStep === 0 || idx === endIndex)
      .map((idx) => Math.min(idx, endIndex));
    const rangeLabel =
      referencePoints.length > 1
        ? `${new Date(referencePoints[startIndex]?.ts ?? referencePoints[0].ts).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
          })} - ${new Date(referencePoints[referencePoints.length - 1].ts).toLocaleDateString(
            "es-CL",
            {
              day: "2-digit",
              month: "2-digit",
            }
          )}`
        : "Últimas 2 horas";
    const totalsOriginByDevice = new Map(
      kpclTotalsOrigin.map((row) => [row.device_id, row])
    );
    const totalOnlineHoursByDevice = new Map(
      rows.map((row) => [
        row.device_id,
        totalsOriginByDevice.get(row.device_id)?.online_hours_total ?? 0,
      ])
    );
    const totalDataMbByDevice = new Map(
      rows.map((row) => [
        row.device_id,
        totalsOriginByDevice.get(row.device_id)?.data_mb_total ?? 0,
      ])
    );
    const totalsAll = {
      onlineHours: Array.from(totalOnlineHoursByDevice.values()).reduce(
        (acc, value) => acc + value,
        0
      ),
      dataMb: Array.from(totalDataMbByDevice.values()).reduce(
        (acc, value) => acc + value,
        0
      ),
    };
    const visibleOnlineHoursByDevice = new Map(
      rows.map((row) => [
        row.device_id,
        row.points
          .slice(startIndex, endIndex + 1)
          .reduce((acc, point) => acc + (point.online === true ? 1 : 0), 0),
      ])
    );
    const visibleDataMbByDevice = new Map(
      rows.map((row) => {
        const payloadBytes = row.points
          .slice(startIndex, endIndex + 1)
          .reduce((acc, point) => acc + (point.payload_bytes ?? 0), 0);
        return [row.device_id, payloadBytes / (1024 * 1024)];
      })
    );
    const totalsVisible = {
      onlineHours: Array.from(visibleOnlineHoursByDevice.values()).reduce(
        (acc, value) => acc + value,
        0
      ),
      dataMb: Array.from(visibleDataMbByDevice.values()).reduce(
        (acc, value) => acc + value,
        0
      ),
    };
    const kpclByDeviceId = new Map(kpclDevices.map((d) => [d.device_id, d]));
    const lastSeenByDevice = new Map(
      rows.map((row) => [row.device_id, formatLastSeenShort(kpclByDeviceId.get(row.device_id)?.last_seen ?? null)])
    );
    const latestLastSeenTs = rows.reduce((maxTs, row) => {
      const tsRaw = kpclByDeviceId.get(row.device_id)?.last_seen ?? null;
      const ts = tsRaw ? Date.parse(tsRaw) : NaN;
      return Number.isFinite(ts) ? Math.max(maxTs, ts) : maxTs;
    }, 0);
    const latestLastSeenLabel =
      latestLastSeenTs > 0
        ? new Date(latestLastSeenTs).toLocaleString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "-";
    const onlineNow = kpclDevices.filter((d) => d.is_online).length;
    const sideStartX = left + plotWidth + sideGap;
    const colHoursX = sideStartX;
    const colMbX = sideStartX + 62;
    const colLastSeenX = sideStartX + 124;
    return {
      rows,
      width,
      height,
      left,
      top,
      rowGap,
      rowHeight,
      xWidth,
      plotWidth,
      sideInfoWidth,
      sideGap,
      hourWidth,
      hours,
      startIndex,
      endIndex,
      maxOffset,
      safeOffset,
      windowSpanHours,
      xTicks,
      referencePoints,
      rangeLabel,
      totalOnlineHoursByDevice,
      totalDataMbByDevice,
      visibleOnlineHoursByDevice,
      visibleDataMbByDevice,
      totalsAll,
      totalsVisible,
      lastSeenByDevice,
      latestLastSeenLabel,
      onlineNow,
      sideStartX,
      colHoursX,
      colMbX,
      colLastSeenX,
    };
  }, [kpclHourlyStatus, historyOffsetHours, kpclDevices, kpclTotalsOrigin]);

  const selectedKpcl = useMemo(
    () => kpclDevices.find((d) => d.device_id === selectedKpclId) ?? null,
    [kpclDevices, selectedKpclId]
  );

  const selectedKpclCatalog = useMemo(
    () => resolveKpclCatalog(selectedKpcl, kpclCatalog),
    [selectedKpcl, kpclCatalog]
  );

  const selectedKpclCost = useMemo(() => {
    const selectedId = selectedKpcl?.device_id ?? "";
    const has3dPrint = has3dPrintForKpcl(selectedId);
    const effectiveComponents = selectedKpclCatalog.components.filter(
      (c) => has3dPrint || c.code !== "BODY_3D"
    );
    const componentsTotal = effectiveComponents.reduce(
      (acc, c) => acc + c.qty * c.unit_cost_usd,
      0
    );
    const buildUnitUsd = componentsTotal;
    const monthlyRuntimeUsd =
      selectedKpclCatalog.maintenance_monthly_usd + selectedKpclCatalog.power_monthly_usd;
    const buildUnitClp = buildUnitUsd * FX_CLP_PER_USD;
    return {
      has3dPrint,
      effectiveComponents,
      componentsTotal,
      buildUnitUsd,
      buildUnitClp,
      monthlyRuntimeUsd,
    };
  }, [selectedKpclCatalog, selectedKpcl]);

  const selectedKpclRuntimeSim = useMemo(() => {
    const mbByDevice = new Map(
      kpclTotalsOrigin.map((row) => [row.device_id, Number(row.data_mb_total ?? 0)])
    );
    const hoursByDevice = new Map(
      kpclTotalsOrigin.map((row) => [row.device_id, Number(row.online_hours_total ?? 0)])
    );
    const deviceMb = mbByDevice.get(selectedKpclId) ?? 0;
    const deviceHours = hoursByDevice.get(selectedKpclId) ?? 0;
    const totalMb = Math.max(
      0.0001,
      kpclTotalsOrigin.reduce((acc, row) => acc + Number(row.data_mb_total ?? 0), 0)
    );
    const totalHours = Math.max(
      0.0001,
      kpclTotalsOrigin.reduce((acc, row) => acc + Number(row.online_hours_total ?? 0), 0)
    );

    const mbShare = deviceMb / totalMb;
    const hourShare = deviceHours / totalHours;

    const hivemqPlan = financePlans.find(
      (p) => p.provider.toLowerCase() === "hivemq" && p.is_active
    );
    const vercelPlan = financePlans.find(
      (p) => p.provider.toLowerCase() === "vercel" && p.is_active
    );

    // Si el plan es free (0 USD), usamos shadow-pricing proporcional a tráfico real.
    const hivemqBudgetMonthly =
      Number(hivemqPlan?.monthly_cost_usd ?? 0) > 0
        ? Number(hivemqPlan?.monthly_cost_usd ?? 0)
        : totalMb * 0.06;
    const vercelBudgetMonthly =
      Number(vercelPlan?.monthly_cost_usd ?? 0) > 0
        ? Number(vercelPlan?.monthly_cost_usd ?? 0)
        : totalMb * 0.04 + totalHours * 0.01;

    const hivemqUnitUsd = hivemqBudgetMonthly * mbShare;
    const vercelUnitUsd = vercelBudgetMonthly * (mbShare * 0.7 + hourShare * 0.3);

    return {
      deviceMb,
      deviceHours,
      totalMb,
      totalHours,
      hivemqUnitUsd,
      vercelUnitUsd,
      monthlyOpsUsd:
        selectedKpclCost.monthlyRuntimeUsd + hivemqUnitUsd + vercelUnitUsd,
    };
  }, [kpclTotalsOrigin, selectedKpclId, financePlans, selectedKpclCost.monthlyRuntimeUsd]);

  const kpclRuntimeByDevice = useMemo(() => {
    const mbByDevice = new Map(
      kpclTotalsOrigin.map((row) => [row.device_id, Number(row.data_mb_total ?? 0)])
    );
    const hoursByDevice = new Map(
      kpclTotalsOrigin.map((row) => [row.device_id, Number(row.online_hours_total ?? 0)])
    );
    const totalMb = Math.max(
      0.0001,
      kpclTotalsOrigin.reduce((acc, row) => acc + Number(row.data_mb_total ?? 0), 0)
    );
    const totalHours = Math.max(
      0.0001,
      kpclTotalsOrigin.reduce((acc, row) => acc + Number(row.online_hours_total ?? 0), 0)
    );
    const hivemqPlan = financePlans.find(
      (p) => p.provider.toLowerCase() === "hivemq" && p.is_active
    );
    const vercelPlan = financePlans.find(
      (p) => p.provider.toLowerCase() === "vercel" && p.is_active
    );
    const hivemqBudgetMonthly =
      Number(hivemqPlan?.monthly_cost_usd ?? 0) > 0
        ? Number(hivemqPlan?.monthly_cost_usd ?? 0)
        : totalMb * 0.06;
    const vercelBudgetMonthly =
      Number(vercelPlan?.monthly_cost_usd ?? 0) > 0
        ? Number(vercelPlan?.monthly_cost_usd ?? 0)
        : totalMb * 0.04 + totalHours * 0.01;

    const out = new Map<string, { mb: number; hours: number; hivemqUsd: number; vercelUsd: number }>();
    for (const row of kpclTotalsOrigin) {
      const deviceId = row.device_id;
      const mb = mbByDevice.get(deviceId) ?? 0;
      const hours = hoursByDevice.get(deviceId) ?? 0;
      const mbShare = mb / totalMb;
      const hourShare = hours / totalHours;
      out.set(deviceId, {
        mb,
        hours,
        hivemqUsd: hivemqBudgetMonthly * mbShare,
        vercelUsd: vercelBudgetMonthly * (mbShare * 0.7 + hourShare * 0.3),
      });
    }
    return out;
  }, [kpclTotalsOrigin, financePlans]);

  const kpclFinancialRows = useMemo(() => {
    return kpclDevices.map((d) => {
      const catalog = resolveKpclCatalog(d, kpclCatalog);
      const has3dPrint = has3dPrintForKpcl(d.device_id);
      const components = catalog.components.filter((c) => has3dPrint || c.code !== "BODY_3D");
      const unitUsd = components.reduce((acc, c) => acc + c.qty * c.unit_cost_usd, 0);
      const runtime = kpclRuntimeByDevice.get(d.device_id) ?? {
        mb: 0,
        hours: 0,
        hivemqUsd: 0,
        vercelUsd: 0,
      };
      const monthlyUsd =
        catalog.maintenance_monthly_usd +
        catalog.power_monthly_usd +
        runtime.hivemqUsd +
        runtime.vercelUsd;
      return {
        device_id: d.device_id,
        model: d.device_model ?? d.device_type ?? "N/D",
        has3dPrint,
        unitUsd,
        unitClp: unitUsd * FX_CLP_PER_USD,
        mb28d: runtime.mb,
        monthlyUsd,
        monthlyClp: monthlyUsd * FX_CLP_PER_USD,
      };
    });
  }, [kpclDevices, kpclRuntimeByDevice, kpclCatalog]);

  const dashboardFreshness = useMemo(() => {
    if (!summary?.generated_at) {
      return { label: "Sin timestamp", tone: "text-slate-500" as const };
    }
    const ageMs = Math.max(0, Date.now() - Date.parse(summary.generated_at));
    const ageSec = Math.floor(ageMs / 1000);
    if (ageSec < 60) return { label: `Actualizado hace ${ageSec}s`, tone: "text-emerald-700" as const };
    const ageMin = Math.floor(ageSec / 60);
    if (ageMin < 10) return { label: `Actualizado hace ${ageMin} min`, tone: "text-emerald-700" as const };
    if (ageMin < 30) return { label: `Actualizado hace ${ageMin} min`, tone: "text-amber-700" as const };
    return { label: `Actualizado hace ${ageMin} min`, tone: "text-rose-700" as const };
  }, [summary?.generated_at]);

  const executiveKpis = useMemo(() => {
    if (!summary) return [];
    const kpclOnlinePct =
      summary.kpcl_total_devices > 0
        ? Math.round((summary.kpcl_online_devices / summary.kpcl_total_devices) * 100)
        : 0;
    const bridgeOnlinePct =
      summary.bridge_total > 0 ? Math.round((summary.bridge_active / summary.bridge_total) * 100) : 0;
    const registrationPct =
      (registrationSummary?.total_profiles ?? 0) > 0
        ? Math.round(((registrationSummary?.completed ?? 0) / (registrationSummary?.total_profiles ?? 1)) * 100)
        : 0;
    return [
      { key: "kpcl", label: "KPCL Online", value: `${summary.kpcl_online_devices}/${summary.kpcl_total_devices}`, aux: `${kpclOnlinePct}%` },
      { key: "bridge", label: "Bridge Salud", value: `${summary.bridge_active}/${summary.bridge_total}`, aux: `${bridgeOnlinePct}%` },
      { key: "outages", label: "Outages 24h", value: `${summary.outages_last_24h}`, aux: `${summary.offline_events_last_24h} eventos` },
      { key: "reg", label: "Registros completos", value: `${registrationSummary?.completed ?? 0}/${registrationSummary?.total_profiles ?? 0}`, aux: `${registrationPct}%` },
      {
        key: "supabase",
        label: "Supabase uso",
        value: `${supabaseStorage?.used_percent ?? 0}%`,
        aux: `${supabaseStorage?.used_mb ?? 0}MB / ${supabaseStorage?.plan_mb ?? 0}MB`,
      },
    ];
  }, [summary, registrationSummary, supabaseStorage]);

  const runAllAdminTests = async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setTestRunnerMessage("Necesitas iniciar sesión para ejecutar tests.");
      return;
    }
    setTestsRunning(true);
    setTestRunnerMessage(null);
    try {
      const res = await fetch("/api/admin/tests/run-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "No se pudo ejecutar la suite de tests.");
      }
      setLastTestRun(payload as AdminTestRun);
      setTestRunnerMessage(
        payload.failed_count > 0
          ? `Suite completada con ${payload.failed_count} error(es).`
          : "Suite completada sin errores."
      );
      const historyRes = await fetch("/api/admin/tests/run-all", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (historyRes.ok) {
        const historyPayload = await historyRes.json();
        setTestHistory((historyPayload.history ?? []) as AdminTestHistoryItem[]);
      }
    } catch (error) {
      setTestRunnerMessage(
        error instanceof Error ? error.message : "Error no controlado en test runner."
      );
    } finally {
      setTestsRunning(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10 ${compactDensity ? "admin-density-compact" : ""}`}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
        <header className="surface-card freeform-rise md:sticky md:top-3 z-20 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur">
          <nav className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[280px]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Admin</p>
              <h1 className="display-title text-lg sm:text-xl font-semibold text-slate-900">
                Dashboard Ejecutivo Kittypau
              </h1>
              <p className="text-xs text-slate-500">
                Visión total de operación y auditoría en línea.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                Rol: {role ?? "sin rol"}
              </span>
              <span className={`rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold ${dashboardFreshness.tone}`}>
                {dashboardFreshness.label}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-500">
                Auto refresh: 5 min
              </span>
              <Link
                href="/today"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700"
              >
                Volver a la app
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearTokens();
                  window.location.href = "/login";
                }}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700"
              >
                Cerrar sesión
              </button>
            </div>
          </nav>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setNocMode((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600"
            >
              Modo NOC: {nocMode ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={() => setCompactDensity((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600"
            >
              Densidad: {compactDensity ? "Compacta" : "Normal"}
            </button>
            <button
              type="button"
              onClick={() => setInfraExpanded((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600"
            >
              Infra: {infraExpanded ? "Visible" : "Colapsada"}
            </button>
          </div>
        </header>

        {loading ? (
          <section className="surface-card freeform-rise px-6 py-5 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <Image
                src="/logo_carga.jpg"
                alt="Cargando Kittypau"
                width={34}
                height={34}
                className="h-[34px] w-[34px] rounded-full border border-slate-200 object-cover"
                priority
              />
              <div className="flex items-center gap-2">
                <span>Cargando dashboard admin...</span>
                <span className="font-semibold text-slate-700">{loadingPercent}%</span>
              </div>
              <span className="text-xs text-slate-400">{loadingStage}</span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="surface-card freeform-rise px-6 py-6 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <section className="surface-card freeform-rise order-1 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Avisos críticos
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {healthCheckStatus.lastRunAt ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Último chequeo:{" "}
                      {new Date(healthCheckStatus.lastRunAt).toLocaleTimeString(
                        "es-CL",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={healthCheckStatus.running}
                    onClick={async () => {
                      const token = await getValidAccessToken();
                      if (!token) {
                        setHealthCheckStatus((prev) => ({
                          ...prev,
                          message: "Necesitas iniciar sesión.",
                        }));
                        return;
                      }
                      setHealthCheckStatus((prev) => ({
                        ...prev,
                        running: true,
                        message: null,
                      }));
                      try {
                        const res = await fetch(
                          "/api/admin/health-check?stale_min=10&device_stale_min=10",
                          {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                          }
                        );
                        const payload = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          throw new Error(
                            payload?.error ??
                              "No se pudo ejecutar el health-check."
                          );
                        }
                        setHealthCheckStatus({
                          running: false,
                          lastRunAt: new Date().toISOString(),
                          message: "Health-check ejecutado.",
                        });
                        setReloadNonce((n) => n + 1);
                      } catch (err) {
                        setHealthCheckStatus({
                          running: false,
                          lastRunAt: new Date().toISOString(),
                          message:
                            err instanceof Error
                              ? err.message
                              : "No se pudo ejecutar el health-check.",
                        });
                      }
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {healthCheckStatus.running
                      ? "Chequeando..."
                      : "Ejecutar chequeo"}
                  </button>
                </div>
              </div>
              {healthCheckStatus.message ? (
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {healthCheckStatus.message}
                </p>
              ) : null}
              <div className="mt-3 grid gap-3">
                {criticalAlerts.length ? (
                  criticalAlerts.map((alert) => (
                    <div
                      key={alert}
                      className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                    >
                      {alert}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Sin alertas críticas activas.
                  </div>
                )}
              </div>
            </section>

            <section className="surface-card freeform-rise order-2 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                KPI ejecutivos
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {executiveKpis.map((kpi) => (
                  <div key={kpi.key} className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                    <p className="text-xs text-slate-500">{kpi.aux}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-6">
            <section className="surface-card freeform-rise order-0 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                1) Operación del Servicio
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estado operativo para cliente final: continuidad, disponibilidad y registros completos.
              </p>
              {nocMode ? (
                <div className={`mt-3 rounded-[var(--radius)] border px-3 py-2 text-sm font-semibold ${operationStatus.tone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span>Semáforo operativo: {operationStatus.label}</span>
                    <span className="text-xs">KPCL online {summary.kpcl_online_devices}/{summary.kpcl_total_devices}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium">{operationStatus.detail}</p>
                </div>
              ) : null}
            </section>

            {infraExpanded ? (
            <section className="surface-card freeform-rise order-12 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                Resumen de Finanzas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Estimacion operativa: BOM, costos cloud y snapshot mensual.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">BOM unitario</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    USD {(financeSummary?.bom_unit_cost_usd ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cloud mensual</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    USD {(financeSummary?.cloud_monthly_cost_usd ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Costo mensual total</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    USD {(financeSummary?.total_cost_usd ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Costo unitario (snapshot)</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    USD {(financeSummary?.unit_cost_usd ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-4 md:hidden space-y-2">
                {financePlans.length ? (
                  financePlans.map((plan) => (
                    <div
                      key={`m-${plan.provider}-${plan.plan_name}`}
                      className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-slate-800">
                        {plan.provider} · {plan.plan_name}
                      </p>
                      <p className="text-slate-500">
                        {plan.is_active ? "activo" : "inactivo"} · USD{" "}
                        {Number(plan.monthly_cost_usd ?? 0).toFixed(2)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Sin datos financieros cargados.</p>
                )}
              </div>
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Proveedor</th>
                      <th className="px-2 py-2 font-semibold">Plan</th>
                      <th className="px-2 py-2 font-semibold">Estado</th>
                      <th className="px-2 py-2 font-semibold">Costo mensual</th>
                      <th className="px-2 py-2 font-semibold">Limite/Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financePlans.length ? (
                      financePlans.map((plan) => (
                        <tr key={`${plan.provider}:${plan.plan_name}`} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{plan.provider}</td>
                          <td className="px-2 py-2">
                            {plan.plan_name}
                            {plan.is_free_plan ? (
                              <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Free activo
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">{plan.is_active ? "activo" : "inactivo"}</td>
                          <td className="px-2 py-2">USD {Number(plan.monthly_cost_usd ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2">{plan.limit_label ?? plan.usage_label ?? "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2 py-2 text-slate-500" colSpan={5}>
                          Sin datos financieros cargados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white p-3">
                  <Image
                    src="/illustrations/food.png"
                    alt="Kittypau comedero"
                    width={220}
                    height={220}
                    className="h-auto w-full rounded-[12px] border border-slate-100 object-cover"
                  />
                  <p className="mt-2 text-[10px] text-slate-400">
                    Referencia visual del comedero Kittypau.
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Seleccionar KPCL
                      <select
                        value={selectedKpclId}
                        onChange={(e) => setSelectedKpclId(e.target.value)}
                        className="mt-1 block w-[240px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                      >
                        {kpclDevices.map((d) => (
                          <option key={d.device_id} value={d.device_id}>
                            {d.device_id} · {d.device_model ?? d.device_type ?? "modelo N/D"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-xs text-slate-500">
                      <p>
                        Perfil: <span className="font-semibold text-slate-700">{selectedKpclCatalog.label}</span>
                      </p>
                      <p>
                        Última conexión:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatLastSeenShort(selectedKpcl?.last_seen ?? null)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:hidden">
                    <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-700">
                        Costo unitario componentes: USD {selectedKpclCost.componentsTotal.toFixed(2)}
                      </p>
                      <p className="text-slate-500">{formatClp(selectedKpclCost.buildUnitClp)}</p>
                    </div>
                    <div className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs">
                      <p className="text-slate-600">
                        MB 28d: {selectedKpclRuntimeSim.deviceMb.toFixed(2)} · Opex mensual simulado: USD{" "}
                        {selectedKpclRuntimeSim.monthlyOpsUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="px-2 py-2 font-semibold">Componente</th>
                          <th className="px-2 py-2 font-semibold">Cant.</th>
                          <th className="px-2 py-2 font-semibold">USD Unit</th>
                          <th className="px-2 py-2 font-semibold">USD Total</th>
                          <th className="px-2 py-2 font-semibold">CLP Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedKpclCost.effectiveComponents.map((c) => (
                          <tr key={c.code} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-medium text-slate-800">{c.name}</td>
                            <td className="px-2 py-2">{c.qty}</td>
                            <td className="px-2 py-2">{c.unit_cost_usd.toFixed(2)}</td>
                            <td className="px-2 py-2">{(c.qty * c.unit_cost_usd).toFixed(2)}</td>
                            <td className="px-2 py-2">{formatClp(c.qty * c.unit_cost_usd * FX_CLP_PER_USD)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50">
                          <td className="px-2 py-2 font-semibold text-slate-900" colSpan={3}>
                            Costo componentes por unidad ({selectedKpclCost.has3dPrint ? "con impresión 3D" : "sin impresión 3D"})
                          </td>
                          <td className="px-2 py-2 font-semibold text-slate-900">
                            USD {selectedKpclCost.componentsTotal.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 font-semibold text-slate-900">
                            {formatClp(selectedKpclCost.buildUnitClp)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={5}>
                            Impresión: {selectedKpclCatalog.print_grams}g · {selectedKpclCatalog.print_hours}h · USD{" "}
                            {selectedKpclCatalog.print_unit_cost_usd.toFixed(2)} por unidad ·{" "}
                            {formatClp(selectedKpclCatalog.print_unit_cost_usd * FX_CLP_PER_USD)}.
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={5}>
                            MB en ventana real (28d): {selectedKpclRuntimeSim.deviceMb.toFixed(2)} MB de{" "}
                            {selectedKpclRuntimeSim.totalMb.toFixed(2)} MB totales KPCL.
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={5}>
                            Costo simulado HiveMQ por KPCL: USD {selectedKpclRuntimeSim.hivemqUnitUsd.toFixed(3)} / mes
                            {" · "}
                            Costo simulado Vercel por KPCL: USD {selectedKpclRuntimeSim.vercelUnitUsd.toFixed(3)} / mes
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={5}>
                            Mantenimiento+energía base: USD {selectedKpclCost.monthlyRuntimeUsd.toFixed(2)} / mes
                            {" · "}
                            Operación mensual total simulada: USD{" "}
                            {selectedKpclRuntimeSim.monthlyOpsUsd.toFixed(2)} / mes ({formatClp(
                              selectedKpclRuntimeSim.monthlyOpsUsd * FX_CLP_PER_USD
                            )}).
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 rounded-[10px] border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                    Filamento 3D de referencia: {PLA_FILAMENT_PURCHASE.product} · proveedor {PLA_FILAMENT_PURCHASE.supplier} ·
                    costo compra {formatClp(PLA_FILAMENT_PURCHASE.source_price_clp)} / {PLA_FILAMENT_PURCHASE.source_weight_grams}g
                    (≈ {formatClp(PLA_FILAMENT_PURCHASE.source_price_clp / PLA_FILAMENT_PURCHASE.source_weight_grams)} por gramo).
                  </div>
                  <div className="mt-4 hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="px-2 py-2 font-semibold">KPCL</th>
                          <th className="px-2 py-2 font-semibold">Modelo</th>
                          <th className="px-2 py-2 font-semibold">Impresión 3D</th>
                          <th className="px-2 py-2 font-semibold">Costo unidad (USD/CLP)</th>
                          <th className="px-2 py-2 font-semibold">MB 28d</th>
                          <th className="px-2 py-2 font-semibold">Opex mensual (USD/CLP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kpclFinancialRows.map((r) => (
                          <tr key={r.device_id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">{r.device_id}</td>
                            <td className="px-2 py-2">{r.model}</td>
                            <td className="px-2 py-2">{r.has3dPrint ? "Sí" : "No"}</td>
                            <td className="px-2 py-2">
                              USD {r.unitUsd.toFixed(2)} · {formatClp(r.unitClp)}
                            </td>
                            <td className="px-2 py-2">{r.mb28d.toFixed(2)}</td>
                            <td className="px-2 py-2">
                              USD {r.monthlyUsd.toFixed(2)} · {formatClp(r.monthlyClp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 grid gap-2 md:hidden">
                    {kpclFinancialRows.map((r) => (
                      <div key={`m-fin-${r.device_id}`} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-800">{r.device_id}</p>
                        <p className="text-slate-500">
                          {r.model} · {r.has3dPrint ? "3D: Sí" : "3D: No"}
                        </p>
                        <p className="text-slate-600">
                          Unidad: USD {r.unitUsd.toFixed(2)} · 28d: {r.mb28d.toFixed(2)} MB
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Ultimo calculo:{" "}
                {financeSummary?.generated_at
                  ? new Date(financeSummary.generated_at).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "N/D"}
              </p>
            </section>
            ) : null}

            <section className="surface-card freeform-rise order-3 px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="display-title text-xl font-semibold text-slate-900">
                        Continuidad KPCL
                      </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Eje Y: dispositivos KPCL · Eje X: ventana de 1 hora (estado real por hora).
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Tabla derecha: Hora total y MB total por KPCL (28d), más última conexión.
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {continuityChart.rangeLabel}
                  </p>
                    </div>
                    <div className="inline-flex items-center gap-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                        Sin data
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Prendido
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        Apagado
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[var(--radius)] border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryOffsetHours((prev) =>
                            Math.min(prev + continuityChart.windowSpanHours, continuityChart.maxOffset)
                          )
                        }
                        disabled={continuityChart.safeOffset >= continuityChart.maxOffset}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 disabled:opacity-30"
                        aria-label="Ver historial anterior"
                        title="Ver historial anterior"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryOffsetHours((prev) =>
                            Math.max(prev - continuityChart.windowSpanHours, 0)
                          )
                        }
                        disabled={continuityChart.safeOffset <= 0}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 disabled:opacity-30"
                        aria-label="Volver al rango más reciente"
                        title="Volver al rango más reciente"
                      >
                        →
                      </button>
                    </div>
                    <div className="md:hidden space-y-2">
                      {continuityChart.rows.map((row) => {
                        const totalHours = continuityChart.totalOnlineHoursByDevice.get(row.device_id) ?? 0;
                        const totalMb = continuityChart.totalDataMbByDevice.get(row.device_id) ?? 0;
                        const lastSeen = continuityChart.lastSeenByDevice.get(row.device_id) ?? "-";
                        const isOnline = row.points[row.points.length - 1]?.online === true;
                        return (
                          <div key={`m-cont-${row.device_id}`} className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-800">{row.device_id}</p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isOnline ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {isOnline ? "online" : "offline"}
                              </span>
                            </div>
                            <p className="text-slate-600">{totalHours}h · {totalMb.toFixed(2)}MB</p>
                            <p className="text-slate-500">Última conexión: {lastSeen}</p>
                          </div>
                        );
                      })}
                    </div>
                    <svg
                      viewBox={`0 0 ${continuityChart.width} ${continuityChart.height}`}
                      className="mx-auto hidden w-full max-w-none md:block"
                      role="img"
                      aria-label="Continuidad mensual KPCL"
                    >
                  <rect
                    x={continuityChart.left}
                    y={continuityChart.top - 10}
                    width={continuityChart.plotWidth}
                    height={Math.max(1, continuityChart.rows.length) * continuityChart.rowGap}
                    fill="rgba(148,163,184,0.04)"
                    rx="8"
                  />
                  <line
                    x1={continuityChart.left + continuityChart.plotWidth + continuityChart.sideGap / 2}
                    y1={continuityChart.top - 10}
                    x2={continuityChart.left + continuityChart.plotWidth + continuityChart.sideGap / 2}
                    y2={
                      continuityChart.top +
                      Math.max(1, continuityChart.rows.length) * continuityChart.rowGap
                    }
                    stroke="rgba(148,163,184,0.28)"
                    strokeWidth={1}
                  />

                  {continuityChart.xTicks.map((hourIndex) => {
                    const x =
                      continuityChart.left +
                      (hourIndex - continuityChart.startIndex) * continuityChart.hourWidth;
                    const yStart = continuityChart.top - 10;
                    const yEnd =
                      continuityChart.top +
                      Math.max(1, continuityChart.rows.length) * continuityChart.rowGap;
                    const ts = continuityChart.referencePoints[hourIndex]?.ts;
                    const label =
                      ts !== undefined
                        ? new Date(ts).toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : "-";
                    return (
                      <g key={`x-tick-${hourIndex}`}>
                        <line
                          x1={x}
                          y1={yStart}
                          x2={x}
                          y2={yEnd}
                          stroke="rgba(100,116,139,0.24)"
                          strokeWidth={0.8}
                        />
                        <text
                          x={x}
                          y={continuityChart.height - 12}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#64748b"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {continuityChart.rows.map((row, i) => {
                    const y = continuityChart.top + i * continuityChart.rowGap + continuityChart.rowHeight;
                    return (
                      <g key={row.device_id}>
                        <text
                          x={continuityChart.left - 10}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fontSize="11"
                          fill="#334155"
                        >
                          {row.device_id}
                        </text>
                        {row.points.slice(1).map((point, idx) => {
                          const prev = row.points[idx];
                          if (prev.online === null || point.online === null) {
                            return null;
                          }
                          if (idx < continuityChart.startIndex) return null;
                          const x1 =
                            continuityChart.left +
                            (idx - continuityChart.startIndex) * continuityChart.hourWidth;
                          const x2 =
                            continuityChart.left +
                            (idx + 1 - continuityChart.startIndex) * continuityChart.hourWidth;
                          const stroke =
                            prev.online && point.online
                              ? "rgba(16,185,129,0.78)"
                              : !prev.online && !point.online
                              ? "rgba(239,68,68,0.1)"
                              : point.online
                              ? "rgba(16,185,129,0.78)"
                              : "rgba(239,68,68,0.1)";
                          return (
                            <line
                              key={`${row.device_id}-${idx}`}
                              x1={x1}
                              y1={y}
                              x2={x2}
                              y2={y}
                              stroke={stroke}
                              strokeWidth={8}
                              strokeLinecap="round"
                            />
                          );
                        })}
                        <text
                          x={continuityChart.colHoursX}
                          y={y}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fontSize="9"
                          fill="#475569"
                        >
                          {`${continuityChart.totalOnlineHoursByDevice.get(row.device_id) ?? 0}h`}
                        </text>
                        <text
                          x={continuityChart.colMbX}
                          y={y}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fontSize="9"
                          fill="#475569"
                        >
                          {`${(continuityChart.totalDataMbByDevice.get(row.device_id) ?? 0).toFixed(2)}MB`}
                        </text>
                        <text
                          x={continuityChart.colLastSeenX}
                          y={y}
                          textAnchor="start"
                          dominantBaseline="middle"
                          fontSize="9"
                          fill="#475569"
                        >
                          {continuityChart.lastSeenByDevice.get(row.device_id) ?? "-"}
                        </text>
                      </g>
                    );
                  })}
                  <text
                    x={continuityChart.colHoursX}
                    y={continuityChart.top - 2}
                    textAnchor="start"
                    fontSize="9"
                    fill="#64748b"
                    fontWeight="600"
                  >
                    Hora
                  </text>
                  <text
                    x={continuityChart.colMbX}
                    y={continuityChart.top - 2}
                    textAnchor="start"
                    fontSize="9"
                    fill="#64748b"
                    fontWeight="600"
                  >
                    Megabyte
                  </text>
                  <text
                    x={continuityChart.colLastSeenX}
                    y={continuityChart.top - 2}
                    textAnchor="start"
                    fontSize="9"
                    fill="#64748b"
                    fontWeight="600"
                  >
                    Última conexión
                  </text>
                  <text
                    x={continuityChart.colHoursX}
                    y={continuityChart.height - 28}
                    textAnchor="start"
                    fontSize="9"
                    fill="#334155"
                    fontWeight="600"
                  >
                    {`${continuityChart.totalsAll.onlineHours}h (${(
                      continuityChart.totalsAll.onlineHours / 24
                    ).toFixed(1)}d)`}
                  </text>
                  <text
                    x={continuityChart.colMbX}
                    y={continuityChart.height - 28}
                    textAnchor="start"
                    fontSize="9"
                    fill="#334155"
                    fontWeight="600"
                  >
                    {`${continuityChart.totalsAll.dataMb.toFixed(2)}MB`}
                  </text>
                  <text
                    x={continuityChart.colLastSeenX}
                    y={continuityChart.height - 28}
                    textAnchor="start"
                    fontSize="9"
                    fill="#334155"
                    fontWeight="600"
                  >
                    {`ON ${continuityChart.onlineNow}/${continuityChart.rows.length} · ${continuityChart.latestLastSeenLabel}`}
                  </text>
                    </svg>
                  </div>
                </div>

                <aside className="rounded-[var(--radius)] border border-slate-200 bg-white p-4 xl:sticky xl:top-24 h-fit">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Resumen operativo
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700">KPCL</td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-semibold text-emerald-600">
                              {summary.kpcl_online_devices}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-rose-600">
                              {summary.kpcl_offline_devices}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-slate-900">
                              {summary.kpcl_total_devices}
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700">Bridge</td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-semibold text-emerald-600">
                              {summary.bridge_active}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-rose-600">
                              {summary.bridge_offline}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-slate-900">
                              {summary.bridge_total}
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700">Outages 24h</td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-900">
                            {summary.outages_last_24h}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700">Eventos offline 24h</td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-900">
                            {summary.offline_events_last_24h}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-semibold text-slate-700">Registros</td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-semibold text-emerald-600">
                              {registrationSummary?.completed ?? 0}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-rose-600">
                              {registrationSummary?.pending_total ?? 0}
                            </span>
                            <span className="px-1 text-slate-400">/</span>
                            <span className="font-semibold text-slate-900">
                              {registrationSummary?.total_profiles ?? 0}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 rounded-[var(--radius)] border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Pendientes (detalle)
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          Perfil
                        </p>
                        <p className="text-sm font-semibold text-rose-600">
                          {registrationSummary?.pending_profile ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          Mascota
                        </p>
                        <p className="text-sm font-semibold text-rose-600">
                          {registrationSummary?.pending_pet ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          Dispositivo
                        </p>
                        <p className="text-sm font-semibold text-rose-600">
                          {registrationSummary?.pending_device ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        % Supabase Utilizado
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {supabaseStorage?.used_percent ?? 0}%
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {supabaseStorage?.used_mb ?? 0} MB / {supabaseStorage?.plan_mb ?? 0} MB
                      </p>
                      <p className="text-[10px] text-slate-400">
                        DB: {supabaseStorage?.db_used_mb ?? 0} MB · Storage:{" "}
                        {supabaseStorage?.storage_used_mb ?? 0} MB
                      </p>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        Vercel (uso real)
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        Plan: {vercelUsage?.plan_name ?? "N/D"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Deployments 30d: {vercelUsage?.deployments_30d ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        % usado:{" "}
                        {typeof vercelUsage?.used_percent === "number"
                          ? `${vercelUsage.used_percent}%`
                          : "N/D"}{" "}
                        · Fuente: {vercelUsage?.source ?? "N/D"}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            {infraExpanded ? (
            <section className="surface-card freeform-rise order-11 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                Tablas y Vistas (Uso Aproximado)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Nombre, tamaño estimado y última actualización aproximada.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Objeto</th>
                      <th className="px-2 py-2 font-semibold">Tipo</th>
                      <th className="hidden px-2 py-2 font-semibold lg:table-cell">Descripción</th>
                      <th className="hidden px-2 py-2 font-semibold md:table-cell">Rows (est.)</th>
                      <th className="px-2 py-2 font-semibold">Size (est.)</th>
                      <th className="hidden px-2 py-2 font-semibold lg:table-cell">Última actualización</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbObjectStats.length ? (
                      dbObjectStats.map((row) => (
                        <tr key={`${row.schema_name}.${row.object_name}`} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">
                            {row.schema_name}.{row.object_name}
                          </td>
                          <td className="px-2 py-2">{row.object_type}</td>
                          <td className="hidden px-2 py-2 lg:table-cell">{row.description ?? "Sin descripción"}</td>
                          <td className="hidden px-2 py-2 md:table-cell">{row.row_estimate ?? "-"}</td>
                          <td className="px-2 py-2">{row.size_pretty ?? "-"}</td>
                          <td className="hidden px-2 py-2 lg:table-cell">
                            {row.last_updated_at
                              ? new Date(row.last_updated_at).toLocaleString("es-CL", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2 py-2 text-slate-500" colSpan={6}>
                          Sin datos de tamaño de tablas/vistas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            ) : (
              <section className="surface-card freeform-rise order-11 px-4 py-3 sm:px-6 sm:py-4">
                <p className="text-xs text-slate-500">
                  Infraestructura colapsada. Actívala desde el header para ver telemetría técnica completa.
                </p>
              </section>
            )}

            <section className="surface-card freeform-rise order-6 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                2) Auditoría e Integridad de Datos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Calidad y trazabilidad de datos: registros pendientes, eventos y validaciones.
              </p>
            </section>

            <section className="order-7 grid gap-4 xl:grid-cols-2">
              <article className="surface-card freeform-rise px-6 py-5">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Estado de registro
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Perfil pendiente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {registrationSummary?.pending_profile ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Mascota pendiente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {registrationSummary?.pending_pet ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Dispositivo pendiente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {registrationSummary?.pending_device ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Incompletos {" > "} 24h
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {registrationSummary?.stalled_24h ?? 0}
                    </p>
                  </div>
                </div>
              </article>

              <article className="surface-card freeform-rise px-6 py-5">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Registros pendientes recientes
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="px-2 py-2 font-semibold">Usuario</th>
                        <th className="px-2 py-2 font-semibold">Etapa</th>
                        <th className="px-2 py-2 font-semibold">Alta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(registrationSummary?.pending_recent ?? []).length ? (
                        (registrationSummary?.pending_recent ?? []).map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">
                              {row.user_name ?? "Sin nombre"}
                              {row.city ? ` (${row.city})` : ""}
                            </td>
                            <td className="px-2 py-2">
                              {row.stage === "profile_pending"
                                ? "Perfil"
                                : row.stage === "pet_pending"
                                ? "Mascota"
                                : "Dispositivo"}
                            </td>
                            <td className="px-2 py-2">
                              {row.created_at ? formatAgo(row.created_at) : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={3}>
                            Sin registros pendientes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="surface-card freeform-rise order-9 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                3) Infraestructura y Telemetría
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Salud técnica de plataforma IoT: bridge, dispositivos, uso de servicios y capacidad.
              </p>
            </section>

            {infraExpanded ? (
            <section className="order-10 grid gap-4 xl:grid-cols-2">
              <article className="surface-card freeform-rise px-6 py-5">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Estado de bridges
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="px-2 py-2 font-semibold">Bridge</th>
                        <th className="px-2 py-2 font-semibold">Estado</th>
                        <th className="hidden px-2 py-2 font-semibold sm:table-cell">IP</th>
                        <th className="px-2 py-2 font-semibold">Último seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bridges.map((bridge) => (
                        <tr key={bridge.device_id} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">
                            {bridge.device_id}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                bridge.bridge_status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : bridge.bridge_status === "degraded"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {bridge.bridge_status}
                            </span>
                          </td>
                          <td className="hidden px-2 py-2 sm:table-cell">{bridge.wifi_ip ?? "-"}</td>
                          <td className="px-2 py-2">
                            {bridge.last_seen
                              ? new Date(bridge.last_seen).toLocaleString("es-CL")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="surface-card freeform-rise px-6 py-5">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Estado KPCL (online/offline)
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="px-2 py-2 font-semibold">Device</th>
                        <th className="px-2 py-2 font-semibold">Estado</th>
                        <th className="hidden px-2 py-2 font-semibold sm:table-cell">Batería</th>
                        <th className="px-2 py-2 font-semibold">Último seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpclDevices.length ? (
                        kpclDevices.map((device) => (
                          <tr key={device.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">
                              {device.device_id}
                            </td>
                            <td className="hidden px-2 py-2 sm:table-cell">
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  device.is_online
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {device.is_online ? "online" : "offline"}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="inline-flex items-center gap-1.5">
                                <BatteryStatusIcon level={device.battery_level} className="h-4 w-4" />
                                {device.battery_level !== null ? `${device.battery_level}%` : "-"}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {device.last_seen
                                ? new Date(device.last_seen).toLocaleString("es-CL")
                                : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={4}>
                            Sin dispositivos KPCL.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
            ) : null}

            <section className="surface-card freeform-rise order-8 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="display-title text-xl font-semibold text-slate-900">
                    Suite de Tests Admin
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Ejecuta validaciones de vistas, catálogos y fuentes del dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runAllAdminTests}
                  disabled={testsRunning}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  {testsRunning ? "Ejecutando tests..." : "Correr todos los tests"}
                </button>
              </div>

              {testRunnerMessage ? (
                <p className="mt-3 text-xs font-semibold text-slate-600">{testRunnerMessage}</p>
              ) : null}

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Test</th>
                      <th className="hidden px-2 py-2 font-semibold sm:table-cell">Origen</th>
                      <th className="hidden px-2 py-2 font-semibold md:table-cell">Descripción</th>
                      <th className="hidden px-2 py-2 font-semibold lg:table-cell">Resultado esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_TEST_CATALOG.map((test) => (
                      <tr key={test.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{test.name}</td>
                        <td className="hidden px-2 py-2 sm:table-cell">{test.source}</td>
                        <td className="hidden px-2 py-2 md:table-cell">{test.description}</td>
                        <td className="hidden px-2 py-2 lg:table-cell">{test.expected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Nota: los tests "API" se ejecutan con el botón de suite. Los tests "PS1" son scripts operativos manuales.
              </p>

              {lastTestRun ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Última ejecución: {lastTestRun.total_count - lastTestRun.failed_count}/{lastTestRun.total_count} OK
                  </p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400">
                          <th className="px-2 py-2 font-semibold">Test</th>
                          <th className="px-2 py-2 font-semibold">Estado</th>
                          <th className="px-2 py-2 font-semibold">Duración</th>
                          <th className="hidden px-2 py-2 font-semibold md:table-cell">Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastTestRun.results.map((result) => (
                          <tr key={`last-${result.id}`} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">{result.name}</td>
                            <td className="px-2 py-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  result.status === "pass"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {result.status === "pass" ? "OK" : "ERROR"}
                              </span>
                            </td>
                            <td className="px-2 py-2">{result.duration_ms} ms</td>
                            <td className="hidden px-2 py-2 md:table-cell">{result.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">
                  Historial de errores (persistido en auditoría)
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="px-2 py-2 font-semibold">Fecha</th>
                        <th className="px-2 py-2 font-semibold">Estado</th>
                        <th className="px-2 py-2 font-semibold">Errores</th>
                        <th className="hidden px-2 py-2 font-semibold md:table-cell">Total tests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testHistory.length ? (
                        testHistory.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-2 py-2">
                              {new Date(row.created_at).toLocaleString("es-CL")}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  row.status === "passed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {row.status ?? "-"}
                              </span>
                            </td>
                            <td className="px-2 py-2">{row.failed_count ?? 0}</td>
                            <td className="hidden px-2 py-2 md:table-cell">{row.total_count ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-2 py-2 text-slate-500" colSpan={4}>
                            Sin errores registrados en tests.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="surface-card freeform-rise order-4 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="display-title text-xl font-semibold text-slate-900">
                Resumen de incidentes (24h)
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Bridge offline
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.bridge_offline_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Device offline
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.device_offline_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Outage detectado
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.general_device_outage_detected ?? 0}
                  </p>
                </div>
                <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Outage recuperado
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {incidentCounters?.general_device_outage_recovered ?? 0}
                  </p>
                </div>
              </div>
            </section>

            <section className="surface-card freeform-rise order-8 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between">
                <h2 className="display-title text-xl font-semibold text-slate-900">
                  Audit events en línea
                </h2>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Auto refresh 5 min
                  </span>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={groupAudit}
                      onChange={(event) => {
                        setGroupAudit(event.target.checked);
                        setExpandedGroupKey(null);
                      }}
                    />
                    Agrupar repetidos
                  </label>
                  <select
                    value={auditFilter}
                    onChange={(event) =>
                      setAuditFilter(event.target.value as AuditFilter)
                    }
                    className="h-8 rounded-[var(--radius)] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600"
                    aria-label="Filtrar audit events"
                  >
                    <option value="critical">Críticos</option>
                    <option value="bridge">Bridge</option>
                    <option value="devices">Dispositivos</option>
                    <option value="outages">Outages</option>
                    <option value="all">Todos</option>
                  </select>
                  <select
                    value={auditWindowMin}
                    onChange={(event) => setAuditWindowMin(Number(event.target.value))}
                    className="h-8 rounded-[var(--radius)] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600"
                    aria-label="Ventana de tiempo audit events"
                  >
                    <option value={15}>15 min</option>
                    <option value={60}>60 min</option>
                    <option value={180}>3 h</option>
                    <option value={1440}>24 h</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="px-2 py-2 font-semibold">Fecha</th>
                      <th className="hidden px-2 py-2 font-semibold sm:table-cell">Hace</th>
                      <th className="px-2 py-2 font-semibold">Evento</th>
                      <th className="hidden px-2 py-2 font-semibold lg:table-cell">Entidad</th>
                      <th className="hidden px-2 py-2 font-semibold md:table-cell">Repeticiones</th>
                      <th className="hidden px-2 py-2 font-semibold md:table-cell">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groupAudit
                      ? groupedAudit
                      : events.map(
                          (event) =>
                            ({
                              key: event.id,
                              event_type: event.event_type,
                              entity_type: event.entity_type ?? null,
                              message:
                                typeof event.payload?.message === "string"
                                  ? event.payload.message
                                  : null,
                              latest_at: event.created_at,
                              count: 1,
                              sample: [event],
                            }) as AuditGroup
                        )
                    ).map((group) => {
                      const badge = eventBadge(group.event_type);
                      const isExpanded =
                        groupAudit && expandedGroupKey === group.key;
                      return (
                        <Fragment key={group.key}>
                          <tr className="border-b border-slate-100 align-top">
                            <td className="px-2 py-2 whitespace-nowrap">
                              {new Date(group.latest_at).toLocaleString("es-CL")}
                            </td>
                            <td className="hidden px-2 py-2 whitespace-nowrap text-slate-500 sm:table-cell">
                              {formatAgo(group.latest_at)}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={badge.className}>
                                  {badge.label}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {group.event_type}
                                </span>
                              </div>
                            </td>
                            <td className="hidden px-2 py-2 lg:table-cell">{group.entity_type ?? "-"}</td>
                            <td className="hidden px-2 py-2 md:table-cell">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                                  ×{group.count}
                                </span>
                                {groupAudit && group.count > 1 ? (
                                  <button
                                    type="button"
                                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                    onClick={() =>
                                      setExpandedGroupKey((prev) =>
                                        prev === group.key ? null : group.key
                                      )
                                    }
                                    aria-expanded={isExpanded}
                                  >
                                    {isExpanded ? "Ocultar" : "Ver"}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="hidden px-2 py-2 md:table-cell">{group.message ?? "-"}</td>
                          </tr>
                          {isExpanded ? (
                            <tr className="border-b border-slate-100">
                              <td colSpan={6} className="px-2 pb-3 pt-1">
                                <div className="rounded-[calc(var(--radius)-8px)] border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                                  <p className="font-semibold text-slate-700">
                                    Muestras recientes (máx. {group.sample.length})
                                  </p>
                                  <div className="mt-2 grid gap-1">
                                    {group.sample.map((evt) => (
                                      <div
                                        key={evt.id}
                                        className="flex flex-wrap items-center justify-between gap-2"
                                      >
                                        <span className="text-slate-500">
                                          {new Date(evt.created_at).toLocaleString("es-CL")}
                                        </span>
                                        <span className="text-slate-700">
                                          {typeof evt.payload?.message === "string"
                                            ? evt.payload.message
                                            : "-"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


