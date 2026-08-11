"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Ponytail: patrón extraído del modal de registro de (public)/login/page.tsx (ya en
// producción desde 2026-07-01) — no un diseño nuevo, solo generalizado a componente
// compartido. Ver Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md U1.
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AccessibleModal({
  onClose,
  titleId,
  children,
  maxWidthClassName = "max-w-sm",
}: {
  onClose: () => void;
  /** id del elemento que contiene el título visible del modal (para aria-labelledby). */
  titleId: string;
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidthClassName} overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl max-h-[90vh] sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
