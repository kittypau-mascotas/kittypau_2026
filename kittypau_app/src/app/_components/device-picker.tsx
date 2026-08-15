"use client";

// SPEC_10 — select de dispositivos reales (sin dueño) para vincular, en vez
// de tipear un código KPCL0000 a ciegas. Compartido por los 3 lugares que
// tenían el mismo patrón: registro-flow.tsx, dispositivos/nuevo/page.tsx,
// bowl/page.tsx ("Agregar dispositivo").
import { useEffect, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/token";
import { DEVICE_ONLINE_THRESHOLD_MS } from "@/lib/device-diagnostics";

type AvailableDevice = {
  id: string;
  device_id: string;
  device_type: string;
  device_state: string;
  last_seen: string | null;
};

// Mismo indicador 🟢🔴⚫ que el resto de la app (ver CLAUDE.md) — un <select>
// nativo solo puede mostrar texto en sus <option>, así que va el emoji
// directo, no un dot de color como en las cards.
function statusEmoji(lastSeen: string | null) {
  if (!lastSeen) return "⚫";
  const ts = Date.parse(lastSeen);
  if (!Number.isFinite(ts)) return "⚫";
  return Date.now() - ts < DEVICE_ONLINE_THRESHOLD_MS ? "🟢" : "🔴";
}

export default function DevicePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (deviceUuid: string, device: AvailableDevice | null) => void;
  className?: string;
}) {
  const [devices, setDevices] = useState<AvailableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        if (mounted) {
          setError("Sesión no válida.");
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch("/api/devices/available", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
          throw new Error("No se pudo cargar la lista de dispositivos.");
        const list = (await res.json()) as AvailableDevice[];
        if (!mounted) return;
        setDevices(list);
        if (list.length > 0 && !value) onChange(list[0].id, list[0]);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Error al cargar dispositivos.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mt-2 text-xs text-slate-400">
        Cargando dispositivos...
      </div>
    );
  }

  if (error) {
    return <div className="mt-2 text-xs text-rose-600">{error}</div>;
  }

  if (devices.length === 0) {
    return (
      <div className="mt-2 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        No hay dispositivos disponibles para vincular.
      </div>
    );
  }

  return (
    <select
      className={
        className ??
        "mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
      }
      value={value}
      onChange={(e) => {
        const selected = devices.find((d) => d.id === e.target.value) ?? null;
        onChange(e.target.value, selected);
      }}
    >
      {devices.map((device) => (
        <option key={device.id} value={device.id}>
          {`${statusEmoji(device.last_seen)} ${device.device_id}`}
        </option>
      ))}
    </select>
  );
}
