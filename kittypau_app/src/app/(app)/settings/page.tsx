"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";

type ApiProfile = {
  id: string;
  email?: string | null;
  user_name?: string | null;
  owner_name?: string | null;
  phone_number?: string | null;
  notification_channel?: string | null;
  city?: string | null;
  country?: string | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  profile: ApiProfile | null;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  profile: null,
};

const apiBase = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export default function SettingsPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [form, setForm] = useState<ApiProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadProfile = async (token: string) => {
    const res = await fetch(`${apiBase}/api/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudo cargar el perfil.");
    return (await res.json()) as ApiProfile;
  };

  const saveProfile = async (token: string, payload: ApiProfile) => {
    const res = await fetch(`${apiBase}/api/profiles`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("No se pudo actualizar el perfil.");
    return (await res.json()) as ApiProfile;
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getAccessToken();
      if (!token) {
        clearTokens();
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Sesión no válida. Vuelve a iniciar sesión.",
          }));
        }
        return;
      }
      try {
        const profile = await loadProfile(token);
        if (!mounted) return;
        setState({ isLoading: false, error: null, profile });
        setForm(profile);
      } catch (err) {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo cargar la configuración.",
        }));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof ApiProfile, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
  };

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Preferencias</p>
          <h1>Ajustes</h1>
        </div>
        <Link href="/today" className="ghost-link">
          Volver a hoy
        </Link>
      </div>

      {state.error && (
        <div className="alert alert-error">{state.error}</div>
      )}

      {state.isLoading ? (
        <div className="surface-card px-6 py-6">Cargando ajustes...</div>
      ) : !state.profile ? (
        <div className="empty-state">
          <p className="empty-title">No se encontró tu perfil.</p>
          <p className="empty-text">
            Completa el onboarding para crear tu perfil antes de ajustar
            preferencias.
          </p>
          <div className="empty-actions">
            <Link
              href="/onboarding"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a onboarding
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="surface-card px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Perfil principal
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Nombre visible
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.user_name ?? ""}
                  onChange={(event) =>
                    handleChange("user_name", event.target.value)
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                Nombre del dueño
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.owner_name ?? ""}
                  onChange={(event) =>
                    handleChange("owner_name", event.target.value)
                  }
                />
              </label>
              <label className="text-sm text-slate-600">
                Email
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.email ?? ""}
                  disabled
                />
              </label>
              <label className="text-sm text-slate-600">
                Teléfono
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.phone_number ?? ""}
                  onChange={(event) =>
                    handleChange("phone_number", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="surface-card px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Notificaciones
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Canal preferido
                <select
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  value={form?.notification_channel ?? ""}
                  onChange={(event) =>
                    handleChange("notification_channel", event.target.value)
                  }
                >
                  <option value="">Sin definir</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="push">Push</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Ciudad
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.city ?? ""}
                  onChange={(event) => handleChange("city", event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-600">
                País
                <input
                  className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  value={form?.country ?? ""}
                  onChange={(event) =>
                    handleChange("country", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="surface-card px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                {saveMessage ?? "Guarda tus cambios para mantener todo actualizado."}
              </div>
              <button
                type="button"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                disabled={saving || !form}
                onClick={async () => {
                  if (!form) return;
                  const token = await getAccessToken();
                  if (!token) return;
                  setSaving(true);
                  setSaveMessage(null);
                  try {
                    const updated = await saveProfile(token, form);
                    setForm(updated);
                    setState((prev) => ({ ...prev, profile: updated }));
                    setSaveMessage("Cambios guardados.");
                  } catch (err) {
                    setSaveMessage(
                      err instanceof Error
                        ? err.message
                        : "No se pudieron guardar los cambios."
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
