export default function Loading() {
  return (
    <div className="route-loading-page">
      <img
        src="/logo.jpg"
        alt="Kittypau"
        className="route-loading-logo"
        aria-hidden
      />
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
