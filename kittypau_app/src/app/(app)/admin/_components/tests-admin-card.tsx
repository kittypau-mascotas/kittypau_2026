/** Sección "Suite de Tests Admin" de /admin — catálogo de tests, botón de
 * ejecución, última corrida y el historial persistido en auditoría.
 * Extraído tal cual de admin/page.tsx, cero cambio de comportamiento —
 * mismo patrón que infraestructura-card.tsx/auditoria-card.tsx (batch 2). */

import SectionStatusCard, { type SectionStatus } from "./section-status-card";

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
    description:
      "Prueba flujo de autenticación (login, token y acceso protegido).",
    expected: "Token válido y respuestas HTTP esperadas para auth.",
  },
  {
    id: "ps_test_db_api",
    name: "PowerShell: TEST_DB_API",
    source: "PS1 · Docs/TEST_DB_API.ps1",
    description:
      "Valida endpoints principales de base de datos/API en escenario positivo.",
    expected: "Respuestas 2xx con payload consistente.",
  },
  {
    id: "ps_test_db_api_negative",
    name: "PowerShell: TEST_DB_API_NEGATIVE",
    source: "PS1 · Docs/TEST_DB_API_NEGATIVE.ps1",
    description:
      "Ejecuta casos negativos para validar control de errores y permisos.",
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
    description:
      "Simula envío de webhook MQTT para validar ingesta y persistencia.",
    expected: "Webhook aceptado y lectura registrada en backend.",
  },
] as const;

export default function TestsAdminCard({
  testsSectionStatus,
  testRunnerMessage,
  runAllAdminTests,
  testsRunning,
  canRunTestSuite,
  lastTestRun,
  testHistory,
}: {
  testsSectionStatus: SectionStatus;
  testRunnerMessage: string | null;
  runAllAdminTests: () => void;
  testsRunning: boolean;
  canRunTestSuite: boolean;
  lastTestRun: AdminTestRun | null;
  testHistory: AdminTestHistoryItem[];
}) {
  return (
    <section className="surface-card freeform-rise order-8 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display-title text-xl font-semibold text-slate-900">
            Suite de Tests Admin
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ejecuta validaciones de vistas, catálogos y fuentes del dashboard.
          </p>
          <SectionStatusCard
            title="Calidad y Tests"
            data={testsSectionStatus}
          />
        </div>
        <button
          type="button"
          onClick={runAllAdminTests}
          disabled={testsRunning || !canRunTestSuite}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
        >
          {testsRunning ? "Ejecutando tests..." : "Correr todos los tests"}
        </button>
      </div>

      {testRunnerMessage ? (
        <p className="mt-3 text-xs font-semibold text-slate-600">
          {testRunnerMessage}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-600">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="px-2 py-2 font-semibold">Test</th>
              <th className="hidden px-2 py-2 font-semibold sm:table-cell">
                Origen
              </th>
              <th className="hidden px-2 py-2 font-semibold md:table-cell">
                Descripción
              </th>
              <th className="hidden px-2 py-2 font-semibold lg:table-cell">
                Resultado esperado
              </th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_TEST_CATALOG.map((test) => (
              <tr key={test.id} className="border-b border-slate-100">
                <td className="px-2 py-2 font-semibold text-slate-800">
                  {test.name}
                </td>
                <td className="hidden px-2 py-2 sm:table-cell">
                  {test.source}
                </td>
                <td className="hidden px-2 py-2 md:table-cell">
                  {test.description}
                </td>
                <td className="hidden px-2 py-2 lg:table-cell">
                  {test.expected}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lastTestRun ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-700">
            Última ejecución:{" "}
            {lastTestRun.total_count - lastTestRun.failed_count}/
            {lastTestRun.total_count} OK
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="px-2 py-2 font-semibold">Test</th>
                  <th className="px-2 py-2 font-semibold">Estado</th>
                  <th className="px-2 py-2 font-semibold">Duración</th>
                  <th className="hidden px-2 py-2 font-semibold md:table-cell">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody>
                {lastTestRun.results.map((result) => (
                  <tr
                    key={`last-${result.id}`}
                    className="border-b border-slate-100"
                  >
                    <td className="px-2 py-2 font-semibold text-slate-800">
                      {result.name}
                    </td>
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
                    <td className="hidden px-2 py-2 md:table-cell">
                      {result.details}
                    </td>
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
                <th className="hidden px-2 py-2 font-semibold md:table-cell">
                  Total tests
                </th>
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
                    <td className="hidden px-2 py-2 md:table-cell">
                      {row.total_count ?? 0}
                    </td>
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
  );
}
