"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className="kp-404-page login-ui-font flex min-h-screen items-center justify-center px-4 py-8 sm:py-14"
      style={{
        backgroundColor: "hsl(var(--background))",
        backgroundImage: "url(https://i.imgur.com/76NZB7A.gif)",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-[292px] sm:max-w-[420px]">
        <div className="login-card-brand freeform-rise mb-3 sm:mb-4">
          <div className="login-brand-core">
            <div className="brand-logo-badge" aria-hidden="true">
              <Image
                src="/logo_carga.jpg"
                alt=""
                className="brand-logo-img"
                width={40}
                height={40}
                draggable={false}
              />
            </div>
            <span className="brand-title text-xl text-primary sm:text-2xl">
              Kittypau
            </span>
            <p className="kp-pettech-tagline mt-1 text-xs sm:text-sm">
              PetTech AIoT
            </p>
          </div>
        </div>

        <div className="glass-panel freeform-rise w-full px-4 py-4 text-center sm:px-5 sm:py-5">
          <div className="display-title text-[2.7rem] font-semibold leading-none text-primary sm:text-[3.4rem]">
            {content.code}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 sm:text-sm">
            {content.title}
          </p>
          <p className="mt-4 text-xs text-slate-600 sm:text-sm">
            {content.description}
          </p>

          <div className="mt-6 grid gap-3">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="h-9 w-full rounded-[var(--radius)] border border-primary/35 bg-white/70 text-xs font-semibold text-primary shadow-sm transition hover:bg-white active:scale-[0.99] sm:h-10 sm:text-sm"
              >
                Reintentar
              </button>
            ) : null}
            <Link
              href={primaryCtaHref}
              className="login-submit-button inline-flex h-9 w-full items-center justify-center rounded-[var(--radius)] bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.99] sm:h-10 sm:text-sm"
            >
              {primaryCtaLabel}
            </Link>
            {secondaryCta}
          </div>
        </div>
      </div>
    </main>
  );
}
