"use client";

/** Skeleton de carga genérico — reemplaza el texto plano ("Cargando...")
 * usado hoy en /bowl, /settings, /pet. Usa `animate-pulse` de Tailwind
 * (ya en uso en el proyecto, ver hunger-bar-card.tsx), sin librería nueva.
 * `role="status"` + texto accesible para lectores de pantalla, mismo
 * patrón de accesibilidad que `empty-state.tsx`. SPEC_02 I2. */

export default function PageLoadingSkeleton({
  label,
  lines = 3,
}: {
  label: string;
  lines?: number;
}) {
  return (
    <div
      className="surface-card freeform-rise px-6 py-6"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="animate-pulse space-y-3" aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 rounded bg-slate-200"
            style={{ width: index === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}
