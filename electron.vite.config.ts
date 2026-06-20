import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const ext = ['electron', 'electron/main', 'electron/common', 'electron/renderer']
const cjsOut = { format: 'cjs' as const, entryFileNames: '[name].js' }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ext,
        input: { index: resolve(__dirname, 'src/main/index.ts') },
        output: cjsOut
      }
    },
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ext,
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        output: cjsOut
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: { rollupOptions: { input: { index: resolve(__dirname, 'src/renderer/index.html') } } },
    plugins: [react()],
    resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } }
  }
})
