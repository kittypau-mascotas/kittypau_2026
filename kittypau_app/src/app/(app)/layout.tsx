import AppNav from "./_components/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <AppNav />
      {children}
    </div>
  );
}
