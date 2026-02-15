export default function Loading() {
  return (
    <div className="route-loading-page">
      <div className="route-loading-badge" aria-hidden="true">
        <img src="/logo_carga.jpg" alt="" className="route-loading-hero" />
      </div>
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
