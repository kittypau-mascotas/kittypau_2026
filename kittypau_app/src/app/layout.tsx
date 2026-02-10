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
  metadataBase: new URL("https://kittypau-app.vercel.app"),
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "Kittypau",
    description: "Kittypau - IoT para bienestar de mascotas",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Kittypau",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kittypau",
    description: "Kittypau - IoT para bienestar de mascotas",
    images: ["/logo.jpg"],
  },
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
