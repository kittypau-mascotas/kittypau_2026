"use client";

import { ReactNode } from "react";

type AlertVariant = "error" | "info" | "warning" | "success";

export default function Alert({
  title,
  children,
  actions,
  variant = "info",
}: {
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  variant?: AlertVariant;
}) {
  const variantClasses: Record<AlertVariant, string> = {
    error: "alert-error",
    warning: "alert-warning",
    success: "alert-success",
    info: "alert-info",
  };

  const variantClass = variantClasses[variant];

  return (
    <div
      className={`alert ${variantClass} flex flex-wrap items-center justify-between gap-3`}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="min-w-[220px] flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="mt-1 text-sm">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
