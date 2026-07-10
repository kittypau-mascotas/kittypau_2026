import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Los datos vienen de public/data/ (generados por prepare_data.py)
// No se necesita acceso a carpetas externas al proyecto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true,
  },
})
