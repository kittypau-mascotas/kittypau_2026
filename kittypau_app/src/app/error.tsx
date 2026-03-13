"use client";

import KittypauErrorScreen from "@/app/_components/kittypau-error-screen";
import { inferKittypauErrorTypeFromError } from "@/lib/errors/kittypau-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const type = inferKittypauErrorTypeFromError(error);
  return <KittypauErrorScreen type={type} onRetry={reset} />;
}
