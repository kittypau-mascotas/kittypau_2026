import type { Metadata } from "next";
import { Geist_Mono, Fraunces, Inter, Titan_One } from "next/font/google";
import "./globals.css";
import RouteLoadingOverlay from "./_components/route-loading-overlay";
import NativeApkMode from "./_components/native-apk-mode";

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const titanOne = Titan_One({
  variable: "--font-brand",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f6dbd6",
};

export const metadata: Metadata = {
  title: "KittyPau",
  applicationName: "KittyPau",
  description: "KittyPau - IoT para bienestar de mascotas",
  metadataBase: new URL("https://kittypau-app.vercel.app"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo_carga.jpg",
    apple: "/logo_carga.jpg",
  },
  openGraph: {
    title: "KittyPau | Bienestar Inteligente para Mascotas",
    description:
      "Controla comida, hidratación y actividad en tiempo real con KittyPau.",
    images: [
      {
        url: "/logo_carga.jpg",
        width: 1200,
        height: 630,
        alt: "Kittypau",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KittyPau | Bienestar Inteligente para Mascotas",
    description:
      "Controla comida, hidratación y actividad en tiempo real con KittyPau.",
    images: ["/logo_carga.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${fraunces.variable} ${titanOne.variable} ${geistMono.variable} antialiased`}
      >
        <NativeApkMode />
        <RouteLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
