import Image from "next/image";

export default function Loading() {
  return (
    <div className="route-loading-page">
      <div className="route-loading-badge" aria-hidden="true">
        <Image
          src="/logo_carga.jpg"
          alt=""
          width={200}
          height={200}
          className="route-loading-hero"
        />
      </div>
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
