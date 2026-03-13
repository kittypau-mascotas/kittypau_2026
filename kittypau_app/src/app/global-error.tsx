"use client";

import KittypauErrorScreen from "@/app/_components/kittypau-error-screen";
import { inferKittypauErrorTypeFromError } from "@/lib/errors/kittypau-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const type = inferKittypauErrorTypeFromError(error);

  return (
    <html lang="es">
      <body>
        <KittypauErrorScreen type={type} onRetry={reset} />
      </body>
    </html>
  );
}
