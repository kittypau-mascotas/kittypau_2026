"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MEDIANA_GRAMOS_COMIDA } from "@/lib/hunger-bar";
import { getBatteryStateLabel, mealSizeInfo } from "../_lib/today-format";
import styles from "./today-hud.module.css";

const WELLNESS_BLOCKS = 20;

type BarKind = {
  key: "food" | "water";
  title: string;
  iconSrc: string;
  filledBlocks: number;
  valueLabel: string;
  statusLabel: string;
  noteLabel: string;
  // Segundo cuadro aparte (pedido de Mauro 2026-09-09) -- "próxima comida
  // estimada" separado de "última comida" en vez de un solo cuadro con \n.
  // Agua no lo usa (queda undefined, ese cuadro no se renderiza).
  noteLabelSecondary?: string | null;
  // Gramos de la última comida CONFIRMADA -- pedido de Mauro 2026-09-09:
  // que la barra "¿comió más o menos que lo habitual?" (ya vive en
  // BowlWellnessCard) también aparezca acá. Solo se pasa para la barra de
  // Comida (Agua no tiene mediana calibrada, queda sin esto a propósito).
  mealSizeGramos?: number | null;
};

/**
 * Widget "Barras Sims" del hero de /today -- hoy son 2 barras (Comida/Agua).
 *
 * ⚠️ Este widget es sensible: Mauro ya pidió revertir 3 veces (ver
 * Knowledge/29_Specs/SPEC_04_Metricas_Today_Investigacion.md) cualquier intento de
 * agregarle cards nuevas. Proponer antes de expandirlo, no asumir que hace falta más.
 *
 * Piel visual "HUD" (spec 2026-09-11): mismo dato, mismo cálculo, mismo copy de
 * estado -- solo cambia cómo se dibuja. El color base es fijo por `key`
 * (comida=esmeralda, agua=celeste, spec §3); "Atrasada" pisa ese color con ámbar
 * porque es un estado real del backend, no una preferencia de marca.
 */
export default function BarrasSimsCard({
  deviceId,
  bars,
  powerState,
  batteryState,
  batteryLevel,
}: {
  deviceId: string | null | undefined;
  bars: [BarKind, BarKind];
  powerState: "on" | "off" | "nodata";
  batteryState: string | null | undefined;
  batteryLevel: number | null | undefined;
}) {
  const battery = getBatteryStateLabel(batteryState, batteryLevel);

  // Único momento de movimiento de la barra: 0% -> valor real al montar
  // (spec §7). CSS transition no anima el primer paint, así que se necesita
  // un tick posterior al mount para disparar el cambio de width.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.protectedTag}>
        <span className={styles.dot} />
        Estado actual · no editable
        <span style={{ marginLeft: "auto" }} className={styles.mono}>
          {deviceId ?? "KPCLXXXX"}
        </span>
      </div>
      <div className={styles.resourceRow}>
        {bars.map((bar) => {
          const late = bar.statusLabel === "Atrasada";
          const tone = late ? "late" : bar.key;
          return (
            <div key={bar.key} className={styles.resource}>
              <div className={styles.resourceTop}>
                <span className={`${styles.iconChip} ${styles[bar.key]}`}>
                  <Image
                    src={bar.iconSrc}
                    alt=""
                    aria-hidden={true}
                    width={18}
                    height={18}
                  />
                </span>
                <div className={styles.resourceLabel}>
                  <span className={styles.name}>{bar.title}</span>
                  <span className={styles.value}>{bar.valueLabel}</span>
                </div>
              </div>

              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles[tone]}`}
                  style={{
                    width: filled
                      ? `${Math.round((bar.filledBlocks / WELLNESS_BLOCKS) * 100)}%`
                      : "0%",
                  }}
                />
              </div>

              <div className={styles.resourceMeta}>
                <span className={styles.note}>
                  {bar.noteLabel}
                  {bar.noteLabelSecondary ? `\n${bar.noteLabelSecondary}` : ""}
                </span>
                <span
                  className={`${styles.statusChip} ${styles[late ? "late" : "ok"]}`}
                >
                  {bar.statusLabel}
                </span>
              </div>

              {bar.mealSizeGramos != null
                ? (() => {
                    const info = mealSizeInfo(bar.mealSizeGramos as number);
                    const escalaMax = MEDIANA_GRAMOS_COMIDA * 2;
                    const pct = Math.min(
                      100,
                      Math.round(
                        ((bar.mealSizeGramos as number) / escalaMax) * 100,
                      ),
                    );
                    return (
                      <div>
                        <div className={styles.barTrack} style={{ height: 5 }}>
                          <div
                            className={`${styles.barFill} ${styles.gold}`}
                            style={{ width: filled ? `${pct}%` : "0%" }}
                          />
                        </div>
                        <p
                          className={styles.note}
                          style={{ marginTop: 4, fontSize: 10 }}
                        >
                          {info.label} — {bar.mealSizeGramos} g (habitual:{" "}
                          {MEDIANA_GRAMOS_COMIDA} g)
                        </p>
                      </div>
                    );
                  })()
                : null}
            </div>
          );
        })}
      </div>
      <div className={styles.deviceFoot}>
        <span>
          {powerState === "on"
            ? "Encendido"
            : powerState === "off"
              ? "Apagado"
              : "Sin telemetría"}
        </span>
        <span>{battery.text}</span>
      </div>
    </div>
  );
}
