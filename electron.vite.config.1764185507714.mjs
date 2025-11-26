// electron.vite.config.mjs
import { resolve as resolve2 } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// vite-plugin-copy-logger.js
import { copyFileSync } from "fs";
import { resolve } from "path";
var __electron_vite_injected_dirname = "D:\\OverlayLab_DesktopApp";
function copyLoggerPlugin() {
  return {
    name: "copy-logger",
    writeBundle() {
      try {
        const sourcePath = resolve(__electron_vite_injected_dirname, "logger.js");
        const targetPath = resolve(__electron_vite_injected_dirname, "out/main/logger.js");
        copyFileSync(sourcePath, targetPath);
        console.log("\u2705 Copied logger.js to out/main/logger.js");
      } catch (error) {
        console.error("\u274C Failed to copy logger.js:", error.message);
      }
    }
  };
}

// electron.vite.config.mjs
var __electron_vite_injected_dirname2 = "D:\\OverlayLab_DesktopApp";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve2(__electron_vite_injected_dirname2, "main.js")
        // Explicitly define the entry point
      },
      rollupOptions: {
        external: ["electron", "electron-log", "electron-store", "dockerode", "electron-differential-updater"]
      }
    },
    plugins: [externalizeDepsPlugin(), copyLoggerPlugin()]
  },
  preload: {
    build: {
      lib: {
        entry: resolve2(__electron_vite_injected_dirname2, "preload.js")
        // Explicitly define the entry point
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve2(__electron_vite_injected_dirname2, "src"),
        "@widget": resolve2(__electron_vite_injected_dirname2, "src/widget")
      }
    },
    plugins: [tailwindcss(), react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve2(__electron_vite_injected_dirname2, "src/renderer/index.html")
        }
      }
    },
    server: {
      port: 5173,
      fs: {
        allow: [resolve2(__electron_vite_injected_dirname2, "src")]
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
