import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kittypau - Bienestar Inteligente para Mascotas",
    short_name: "Kittypau",
    description:
      "Monitorea hidratación, alimento y actividad de tu mascota en tiempo real.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6dbd6",
    theme_color: "#f6dbd6",
    lang: "es",
    icons: [
      {
        src: "/logo_carga.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
      {
        src: "/logo_carga.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
    ],
  };
}
