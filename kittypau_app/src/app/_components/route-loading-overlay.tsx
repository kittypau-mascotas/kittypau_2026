"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div className="route-loading-overlay" data-visible={visible}>
      <img
        src="/logo_carga.jpg"
        alt="Kittypau"
        className="route-loading-hero"
        aria-hidden
      />
      <div className="route-loading-indicator" aria-hidden />
      <span className="route-loading-label">Cargando</span>
    </div>
  );
}
