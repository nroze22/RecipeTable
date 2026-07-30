import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/tesseract.js/dist/worker.min.js",
          dest: "tesseract",
          rename: { stripBase: true }
        },
        {
          src: "node_modules/tesseract.js-core/tesseract-core*.wasm.js",
          dest: "tesseract/core",
          rename: { stripBase: true }
        },
        {
          src: "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
          dest: "tesseract/lang",
          rename: { stripBase: true }
        }
      ]
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        globIgnores: ["**/tesseract/**"]
      },
      manifest: {
        name: "RecipeTable",
        short_name: "RecipeTable",
        description: "Turn any recipe into a visual cooking flow.",
        theme_color: "#f4f0e8",
        background_color: "#f4f0e8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
