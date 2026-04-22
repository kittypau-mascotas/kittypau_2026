"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveAuthenticatedPath } from "@/lib/auth/token";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void resolveAuthenticatedPath().then((path) => {
      if (cancelled) return;
      router.replace(path ?? "/login");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
