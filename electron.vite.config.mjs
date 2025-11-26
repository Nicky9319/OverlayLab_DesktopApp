import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import copyLoggerPlugin from './vite-plugin-copy-logger.js'


export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, 'main.js') // Explicitly define the entry point
      },
      rollupOptions: {
        external: ['electron', 'electron-log', 'electron-store', 'dockerode', 'electron-differential-updater']
      }
    },
    plugins: [externalizeDepsPlugin(), copyLoggerPlugin()]
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'preload.js') // Explicitly define the entry point
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src'),
        '@widget': resolve(__dirname, 'src/widget')
      }
    },
    plugins: [tailwindcss(), react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    server: {
      port: 5173,
      fs: {
        allow: [resolve(__dirname, 'src')]
      }
    }
  }
})
