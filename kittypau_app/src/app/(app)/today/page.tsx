"use client";

// La vista de `/today` vive en `<TodayScreen>` (today/_components/today-screen.tsx)
// para poder reusarla EXACTA en la demo pública (`/demo`, mode="demo") sin
// forkear -- ver Knowledge/29_Specs/009-demo-today-en-vivo. Acá se renderiza
// sin props: todo default = comportamiento autenticado de siempre.
import TodayScreen from "./_components/today-screen";

export default function TodayPage() {
  return <TodayScreen />;
}
