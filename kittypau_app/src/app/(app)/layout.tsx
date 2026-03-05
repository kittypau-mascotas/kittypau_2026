import AppNav from "./_components/app-nav";
import SocialLinks from "../_components/social-links";
import { AppDataProvider } from "@/lib/context/app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <div className="app-shell">
        <AppNav />
        {children}
        <footer className="app-footer">
          <SocialLinks size="sm" />
          <div className="app-footer-meta">
            <span>Kittypau · IoT Chile S.A</span>
            <a href="mailto:kittypau.mascotas@gmail.com">
              kittypau.mascotas@gmail.com
            </a>
          </div>
        </footer>
      </div>
    </AppDataProvider>
  );
}
