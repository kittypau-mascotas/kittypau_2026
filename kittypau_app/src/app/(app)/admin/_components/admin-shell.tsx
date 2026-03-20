"use client";

import type { ReactNode } from "react";
import AdminHeader from "./admin-header";
import AdminSidebar from "./admin-sidebar";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-white/10 bg-slate-950/90 backdrop-blur">
          <AdminSidebar />
        </aside>
        <div className="ml-64 flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur">
            <AdminHeader />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
