"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InicioClientePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/today");
  }, [router]);

  return (
    <div className="page-shell">
      <div className="surface-card freeform-rise px-6 py-6 text-sm text-slate-400">
        Cargando...
      </div>
    </div>
  );
}
