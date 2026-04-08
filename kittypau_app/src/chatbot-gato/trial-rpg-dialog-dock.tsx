"use client";

import type { ReactNode } from "react";

type TrialRpgDialogDockProps = {
  children: ReactNode;
};

/**
 * Shared dock for the Kittypau RPG dialog.
 *
 * This keeps the dialog in one canonical scene across pages while the
 * content and page context change underneath it.
 */
export default function TrialRpgDialogDock({
  children,
}: TrialRpgDialogDockProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-[120] flex justify-center px-4">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
