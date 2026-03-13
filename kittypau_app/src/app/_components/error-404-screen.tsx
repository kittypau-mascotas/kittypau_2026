export default function Error404Screen() {
  return (
    <main
      className="login-ui-font flex min-h-screen items-center justify-center px-4 py-16"
      style={{
        backgroundColor: "hsl(var(--background))",
        backgroundImage: "url(https://i.imgur.com/76NZB7A.gif)",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-md">
        <div className="login-card-brand freeform-rise mb-4">
          <div className="login-brand-core">
            <div className="brand-logo-badge" aria-hidden="true">
              <img
                src="/logo_carga.jpg"
                alt=""
                className="brand-logo-img"
                draggable={false}
              />
            </div>
            <span className="brand-title text-3xl text-primary">Kittypau</span>
            <p className="kp-pettech-tagline mt-1">PetTech AIoT</p>
          </div>
        </div>

        <div className="glass-panel freeform-rise w-full px-6 py-6 text-center">
          <div className="display-title text-[4.8rem] font-semibold leading-none text-primary">
            404
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
            Pagina no encontrada
          </p>
          <p className="mt-5 text-sm text-slate-600">
            Ups, la pagina que buscas no existe.
          </p>

          <div className="mt-7">
            <a
              href="/login"
              className="login-submit-button inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99]"
            >
              Ir a KittyPau
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
