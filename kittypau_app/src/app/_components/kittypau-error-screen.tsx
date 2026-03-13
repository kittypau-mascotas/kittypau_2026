"use client";

import type { ReactNode } from "react";
import {
  getKittypauErrorContent,
  type KittypauErrorType,
} from "@/lib/errors/kittypau-error";

type Props = {
  type: KittypauErrorType;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCta?: ReactNode;
  onRetry?: (() => void) | null;
};

export default function KittypauErrorScreen({
  type,
  primaryCtaHref = "/login",
  primaryCtaLabel = "Ir a KittyPau",
  secondaryCta = null,
  onRetry = null,
}: Props) {
  const content = getKittypauErrorContent(type);

  return (
    <main
      className="kp-404-page login-ui-font flex min-h-screen items-center justify-center px-4 py-10 sm:py-16"
      style={{
        backgroundColor: "hsl(var(--background))",
        backgroundImage: "url(https://i.imgur.com/76NZB7A.gif)",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-[320px] sm:max-w-md">
        <div className="login-card-brand freeform-rise mb-3 sm:mb-4">
          <div className="login-brand-core">
            <div className="brand-logo-badge" aria-hidden="true">
              <img
                src="/logo_carga.jpg"
                alt=""
                className="brand-logo-img"
                draggable={false}
              />
            </div>
            <span className="brand-title text-2xl text-primary sm:text-3xl">
              Kittypau
            </span>
            <p className="kp-pettech-tagline mt-1 text-sm sm:text-base">
              PetTech AIoT
            </p>
          </div>
        </div>

        <div className="glass-panel freeform-rise w-full px-5 py-5 text-center sm:px-6 sm:py-6">
          <div className="display-title text-[3.2rem] font-semibold leading-none text-primary sm:text-[4rem]">
            {content.code}
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-700">
            {content.title}
          </p>
          <p className="mt-5 text-sm text-slate-600">{content.description}</p>

          <div className="mt-7 grid gap-3">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="h-10 w-full rounded-[var(--radius)] border border-primary/35 bg-white/70 text-sm font-semibold text-primary shadow-sm transition hover:bg-white active:scale-[0.99]"
              >
                Reintentar
              </button>
            ) : null}
            <a
              href={primaryCtaHref}
              className="login-submit-button inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99]"
            >
              {primaryCtaLabel}
            </a>
            {secondaryCta}
          </div>
        </div>
      </div>
    </main>
  );
}
