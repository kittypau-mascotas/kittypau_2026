"use client";

import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions, Plugin } from "chart.js";
import styles from "./today-hud.module.css";

/**
 * Card del timeline día/noche de /today: navegación de ciclo (anterior/hoy/siguiente) +
 * el chart de Alimentación/Hidratación superpuesto sobre el fondo día/noche.
 *
 * El cálculo de `chartData`/`chartOptions`/`backgroundPlugin` sigue en `today-screen.tsx` --
 * dependen de ~15 variables de estado de la página. Este componente es solo la
 * "carcasa" visual; no es un componente 100% autónomo todavía.
 *
 * Piel "HUD" (spec 2026-09-11): el gráfico de Chart.js sigue siendo el real
 * (mismos datos, tooltip, leyenda -- nada decorativo lo reemplaza), solo cambia
 * el marco que lo rodea. Los colores del propio chart (grid/leyenda/tooltip) se
 * retematizaron en `dayNightChartOptions` (today-screen.tsx) para que combinen
 * con el fondo oscuro.
 */
export default function DayNightTimelineCard({
  dayCycleOffsetDays,
  onOffsetChange,
  rangeTitle,
  chartData,
  chartOptions,
  backgroundPlugin,
  chartLoadError,
  isAuthoritativeFoodDevice,
  authoritativeDeviceCode,
}: {
  dayCycleOffsetDays: number;
  onOffsetChange: (updater: (prev: number) => number) => void;
  rangeTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: ChartData<"line", any[]>;
  chartOptions: ChartOptions<"line">;
  backgroundPlugin: Plugin<"line">;
  chartLoadError: string | null;
  isAuthoritativeFoodDevice: boolean;
  authoritativeDeviceCode: string;
}) {
  return (
    <div className={styles.frame}>
      <span className={styles.sectionLabel}>Ciclo día/noche</span>
      <div className={styles.timelineNav} style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => onOffsetChange((prev) => prev + 1)}
          className={styles.navBtn}
          aria-label="Ciclo anterior"
          title="Ciclo anterior"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange(() => 0)}
          className={styles.navLabel}
          style={{ background: "none", border: "none", cursor: "pointer" }}
          aria-label="Volver a hoy"
          title="Volver a hoy"
        >
          {rangeTitle}
        </button>
        <button
          type="button"
          onClick={() => onOffsetChange((prev) => Math.max(0, prev - 1))}
          disabled={dayCycleOffsetDays === 0}
          className={styles.navBtn}
          aria-label="Ciclo siguiente"
          title="Ciclo siguiente"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className={styles.chartShell}>
        <Line
          data={chartData}
          options={chartOptions}
          plugins={[backgroundPlugin]}
        />
      </div>
      {chartLoadError ? (
        <p className={styles.chartNote}>{chartLoadError}</p>
      ) : null}
      {/* `mqttLiveError` NO se muestra: el error crudo de useMqttLive
          ("MQTT no configurado: faltan NEXT_PUBLIC_..." / fallos de conexión)
          es debugging interno y no le dice nada al dueño de la mascota. El
          gráfico se arma desde readings + audit_events y funciona igual sin
          las lecturas en vivo, que son solo el punto más fresco. */}
      {!isAuthoritativeFoodDevice ? (
        <p className={styles.chartNote}>
          En este dispositivo todavía no distinguimos comida de servido: se
          muestran las lecturas de peso sin clasificar. La detección de comidas
          confirmada está por ahora solo en {authoritativeDeviceCode}.
        </p>
      ) : null}
    </div>
  );
}
