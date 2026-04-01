import Link from "next/link";
import type { ReactNode } from "react";

type OperationalAction = {
  href: string;
  label: string;
};

type OperationalActionsCardProps = {
  description: ReactNode;
  actions: OperationalAction[];
  title?: string;
  className?: string;
};

export default function OperationalActionsCard({
  description,
  actions,
  title = "Acciones rápidas",
  className = "",
}: OperationalActionsCardProps) {
  return (
    <div
      className={[
        "rounded-[calc(var(--radius)-6px)] border border-sky-200 bg-sky-50/70 px-4 py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-sky-500">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-sky-900">
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className="rounded-full border border-sky-200 bg-white px-3 py-2 text-sky-700"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
