"use client";

import { ReactNode } from "react";

export default function EmptyState({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <p className="empty-title">{title}</p>
      {children ? <div className="empty-text">{children}</div> : null}
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}

