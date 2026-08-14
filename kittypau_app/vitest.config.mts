import path from "node:path";
import { defineConfig } from "vitest/config";

// Espeja el alias "@/*" -> "src/*" de tsconfig.json — sin este config, un
// route.ts que importa un helper real (no mockeado) vía "@/lib/..." falla en
// vitest con "Cannot find package '@/lib/...'" (ver
// api/pets/[id]/hunger-bar/route.test.ts).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
