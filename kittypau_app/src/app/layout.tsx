import type { Metadata } from "next";
import { Geist_Mono, Fraunces, Inter, Titan_One } from "next/font/google";
import "./globals.css";
import RouteLoadingOverlay from "./_components/route-loading-overlay";

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

export const metadata: Metadata = {
  title: "Kittypau",
  description: "Kittypau - IoT para bienestar de mascotas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fraunces.variable} ${titanOne.variable} ${geistMono.variable} antialiased`}
      >
        <RouteLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
