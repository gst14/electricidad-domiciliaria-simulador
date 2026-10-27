import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // El chunk diferido de la vista 3D incluye three.js (~1 MB); el bundle inicial no lo carga.
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
});
