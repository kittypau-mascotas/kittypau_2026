import AppNav from "./_components/app-nav";
import { AppDataProvider } from "@/lib/context/app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <div className="app-shell">
        <AppNav />
        <div className="app-content">
          {children}
        </div>
      </div>
    </AppDataProvider>
  );
}
