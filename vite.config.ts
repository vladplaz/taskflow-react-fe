import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // jszip ships a UMD bundle with no ES default export. The Office preview
    // libraries import it as `import JSZip from 'jszip'`, which the production
    // build resolves but the dev server does not -- it serves the UMD file
    // untouched, and the import fails at runtime. Pre-bundling it makes dev
    // behave like the build.
    include: ['jszip'],
  },
})
