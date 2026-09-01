"use client";

import { useEffect, useState } from "react";
import { notifyMealEvent } from "@/lib/hooks/useHungerBarEventNotifications";

/**
 * Botón de QA para probar `useHungerBarEventNotifications` sin esperar un
 * evento real del modelo (que puede tardar horas en aparecer orgánicamente).
 * Dispara la notificación directo, mismo código que usa la app en producción.
 *
 * Solo se renderiza en plataforma nativa (Capacitor) -- nunca aparece en web
 * ni en el navegador de un usuario real. Ver
 * Knowledge/29_Specs/007-motor-alimentacion-produccion/plan.md, Decisión 8.
 */
export default function QaTestMealNotification({
  petName,
}: {
  petName?: string;
}) {
  const [esNativo, setEsNativo] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled) setEsNativo(Capacitor.isNativePlatform());
      } catch {
        // no-op: no es plataforma nativa o el plugin no está disponible
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!esNativo) return null;

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <button
        type="button"
        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm"
        onClick={async () => {
          setEstado("Enviando...");
          const resultado = await notifyMealEvent({
            petName,
            category: "alimentacion",
            startAt: new Date().toISOString(),
          });
          setEstado(
            resultado.ok ? "✓ Notificación enviada" : `✗ ${resultado.reason}`,
          );
        }}
      >
        🧪 QA: probar notificación de &quot;comió&quot;
      </button>
      {estado ? (
        <span className="text-[10px] text-slate-400">{estado}</span>
      ) : null}
    </div>
  );
}
