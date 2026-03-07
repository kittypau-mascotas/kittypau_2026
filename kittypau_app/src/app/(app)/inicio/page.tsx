"use client";

export default function InicioClientePage() {
  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="surface-card freeform-rise px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Inicio cliente
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Vista en blanco
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Esta vista queda vacía para diseñar la experiencia de clientes
            reales en próximas iteraciones.
          </p>
        </section>
      </div>
    </div>
  );
}
