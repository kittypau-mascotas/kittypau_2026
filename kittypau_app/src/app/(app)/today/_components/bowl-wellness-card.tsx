"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getBatteryStateLabel,
  getConnectivityLabel,
  renderTrend,
} from "../_lib/today-format";
import styles from "./today-hud.module.css";

type WellnessState = {
  stateLabel: string;
  actionLabel: string;
  levelLabel: string;
  lastEventLabel: string;
  hasEvidence: boolean;
};

type BowlDevice = {
  device_id?: string | null;
  battery_level?: number | null;
  battery_state?: string | null;
  last_seen?: string | null;
} | null;

type BowlReading = { recorded_at?: string | null } | null;

const KIND_CONFIG = {
  food: {
    title: "Alimentación",
    emptyIllustration: "/illustrations/pink_food_full.png",
    emptyAlt: "Sin comedero",
    emptyLabel: "Sin comedero asignado",
    addLabel: "Agregar comedero",
    contentTitle: "Contenido actual",
  },
  water: {
    title: "Hidratación",
    emptyIllustration: "/illustrations/green_water_full.png",
    emptyAlt: "Sin bebedero",
    emptyLabel: "Sin bebedero asignado",
    addLabel: "Agregar bebedero",
    contentTitle: "Nivel actual",
  },
} as const;

/** Card de "Alimentación"/"Hidratación" del bloque #today-bowls -- un solo componente
 * parametrizado por `kind` en vez de 2 bloques JSX casi idénticos duplicados.
 *
 * Piel "HUD" (spec 2026-09-11): la ilustración de plato/vaso real se reemplaza por
 * un vaso abstracto (relleno proporcional al % de contenido, spec §5.3) -- el dato
 * (fillPct, wellness, chips) es exactamente el mismo que antes.
 */
export default function BowlWellnessCard({
  kind,
  hasDevice,
  device,
  latestReading,
  powerState,
  wellness,
  contentValueText,
  contentWeightGrams,
  prevContentWeightGrams,
  maxReferenceGrams,
  tempText,
  humidityText,
  formatTimestamp,
}: {
  kind: "food" | "water";
  hasDevice: boolean;
  device: BowlDevice;
  latestReading: BowlReading;
  powerState: "on" | "off" | "nodata";
  wellness: WellnessState;
  contentValueText: string;
  contentWeightGrams: number | null;
  prevContentWeightGrams: number | null;
  // "100%" = peso del último "término servido" real (audit_events) -- ver
  // bowlMaxServedContentGrams/waterMaxServedContentMl en today-screen.tsx.
  maxReferenceGrams: number | null;
  tempText: string;
  humidityText: string;
  formatTimestamp: (value?: string | null) => string;
}) {
  const c = KIND_CONFIG[kind];

  // Único momento de movimiento del vaso: 0 -> nivel real al montar, mismo
  // criterio que las Barras Sims (spec §7).
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!hasDevice) {
    return (
      <article className={`${styles.bowlCard} ${styles[kind]}`}>
        <span className={styles.bowlTitle}>{c.title}</span>
        <div className={styles.emptyBowl}>
          <Image
            src={c.emptyIllustration}
            alt={c.emptyAlt}
            width={96}
            height={70}
          />
          <p>{c.emptyLabel}</p>
          <Link href="/bowl">{c.addLabel}</Link>
        </div>
      </article>
    );
  }

  const battery = getBatteryStateLabel(
    device?.battery_state,
    device?.battery_level,
  );

  const fillPct =
    contentWeightGrams !== null &&
    maxReferenceGrams !== null &&
    maxReferenceGrams > 0
      ? Math.round(
          Math.min(
            100,
            Math.max(0, (contentWeightGrams / maxReferenceGrams) * 100),
          ),
        )
      : null;

  const late = wellness.stateLabel === "Atrasada";

  return (
    <article className={`${styles.bowlCard} ${styles[kind]}`}>
      <div className={styles.bowlStatusRow}>
        <span className={styles.bowlTitle}>{c.title}</span>
        <span
          className={`${styles.diagDot} ${styles[powerState === "on" ? "on" : powerState === "off" ? "warn" : "off"]}`}
          aria-hidden="true"
        />
      </div>

      <div className={styles.bowlIllustration}>
        <div
          className={styles.bowlFill}
          style={{ height: filled ? `${fillPct ?? 0}%` : "0%" }}
        />
        {device?.device_id ? (
          <span
            className={styles.mono}
            style={{
              position: "relative",
              fontSize: 10,
              color: "var(--ink-faint)",
            }}
          >
            {device.device_id}
          </span>
        ) : null}
      </div>

      <div className={styles.bowlStatusRow}>
        <span
          className={`${styles.statusChip} ${styles[late ? "late" : "ok"]}`}
        >
          {wellness.stateLabel}
        </span>
        {fillPct !== null ? (
          <span
            className={styles.mono}
            style={{ fontSize: 11, color: "var(--ink-dim)" }}
          >
            {fillPct}%
          </span>
        ) : null}
      </div>
      <p className={styles.bowlNote}>{wellness.lastEventLabel}</p>

      <div className={styles.bowlStats}>
        <div className={styles.statCell}>
          <span className={styles.label}>{c.contentTitle}</span>
          <span className={styles.value}>
            {contentValueText}
            {renderTrend(contentWeightGrams, prevContentWeightGrams)}
          </span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.label}>Temperatura</span>
          <span className={styles.value}>{tempText}</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.label}>Humedad</span>
          <span className={styles.value}>{humidityText}</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.label}>Conexión</span>
          <span className={styles.value}>
            {getConnectivityLabel(
              latestReading?.recorded_at ?? device?.last_seen ?? null,
            )}
          </span>
        </div>
      </div>
      <p className={styles.bowlNote} style={{ marginTop: -2 }}>
        {formatTimestamp(latestReading?.recorded_at ?? null)} · batería{" "}
        {battery.text}
      </p>
    </article>
  );
}
