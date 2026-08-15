"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getValidAccessToken } from "@/lib/auth/token";
import Alert from "@/app/_components/alert";
import DevicePicker from "@/app/_components/device-picker";

type ApiPet = { id: string; name: string; type?: string | null };

const DEVICE_TYPES = [
  { value: "food_bowl", label: "Plato de comida" },
  { value: "water_bowl", label: "Plato de agua" },
];

export default function NuevoDispositivoPage() {
  const router = useRouter();

  const [pets, setPets] = useState<ApiPet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);

  const [deviceUuid, setDeviceUuid] = useState("");
  const [deviceType, setDeviceType] = useState<string>("food_bowl");
  const [petId, setPetId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        setPetsError("Sesión no válida.");
        setLoadingPets(false);
        return;
      }
      try {
        const res = await fetch("/api/pets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("No se pudieron cargar las mascotas.");
        const payload = (await res.json()) as unknown;
        const list: ApiPet[] = Array.isArray(payload)
          ? (payload as ApiPet[])
          : Array.isArray((payload as { data?: ApiPet[] }).data)
            ? ((payload as { data: ApiPet[] }).data ?? [])
            : [];
        if (!mounted) return;
        setPets(list);
        if (list.length > 0) setPetId(list[0]?.id ?? "");
      } catch (err) {
        if (!mounted) return;
        setPetsError(
          err instanceof Error ? err.message : "Error al cargar mascotas.",
        );
      } finally {
        if (mounted) setLoadingPets(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit =
    deviceUuid.length > 0 &&
    deviceType.length > 0 &&
    petId.length > 0 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const token = await getValidAccessToken();
    if (!token) {
      setError("Sesión no válida. Vuelve a iniciar sesión.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_uuid: deviceUuid,
          device_type: deviceType,
          pet_id: petId,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        code?: string;
        message?: string;
      };

      if (!res.ok) {
        const msg =
          data.message ??
          data.error ??
          `Error ${res.status}: no se pudo registrar el dispositivo.`;
        setError(msg);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/bowl"), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error de red. Intenta de nuevo.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dispositivos</p>
          <h1>Agregar dispositivo</h1>
        </div>
        <Link href="/settings" className="ghost-link">
          Volver a ajustes
        </Link>
      </div>

      {error && (
        <Alert variant="error" title="Error al registrar">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Dispositivo registrado">
          El dispositivo fue vinculado correctamente. Redirigiendo...
        </Alert>
      )}

      {petsError && (
        <Alert variant="error" title="Error">
          {petsError}
        </Alert>
      )}

      <section className="surface-card freeform-rise px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Datos del dispositivo
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Elegí el dispositivo de la lista de equipos ya conectados y sin dueño
          todavía.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-5 grid gap-5"
        >
          <label className="text-sm text-slate-600">
            Dispositivo
            <DevicePicker
              value={deviceUuid}
              onChange={(id) => setDeviceUuid(id)}
            />
          </label>

          <label className="text-sm text-slate-600">
            Tipo de dispositivo
            <select
              className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
            >
              {DEVICE_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Mascota
            {loadingPets ? (
              <div className="mt-2 text-xs text-slate-400">
                Cargando mascotas...
              </div>
            ) : pets.length === 0 ? (
              <div className="mt-2 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No tienes mascotas registradas.{" "}
                <Link href="/registro" className="font-semibold underline">
                  Registra una primero.
                </Link>
              </div>
            ) : (
              <select
                className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
              >
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                    {pet.type ? ` (${pet.type})` : ""}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="flex gap-3 pt-1">
            <Link
              href="/settings"
              className="flex-1 rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-2.5 text-center text-xs font-semibold text-slate-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || success}
              className="flex-1 rounded-[var(--radius)] bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting
                ? "Registrando..."
                : success
                  ? "Listo"
                  : "Registrar dispositivo"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card freeform-rise px-6 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
          ¿No aparece tu dispositivo?
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Solo aparecen acá los dispositivos que ya se conectaron a internet al
          menos una vez y todavía no tienen dueño. Si el tuyo es nuevo,
          conectalo primero a tu WiFi.
        </p>
      </section>
    </main>
  );
}
