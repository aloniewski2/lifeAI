import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; everywhere else from /.
  base: process.env.GITHUB_PAGES ? "/lifeAI/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "AI Legacy OS",
        short_name: "Legacy OS",
        description:
          "A private, local-first archive of your life: capture what matters, build your autobiography, and leave messages for the people you love.",
        theme_color: "#12100e",
        background_color: "#12100e",
        display: "standalone",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell including the ONNX runtime WASM, so the
        // whole app (models already cached by the engines) works offline.
        globPatterns: ["**/*.{js,css,html,png,svg,wasm}"],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: process.env.GITHUB_PAGES
          ? "/lifeAI/index.html"
          : "/index.html",
      },
    }),
  ],
  optimizeDeps: {
    // Pre-bundle lazily-imported deps so their first use doesn't trigger a
    // dev-server re-optimization (which reloads the page mid-conversation).
    include: ["kokoro-js", "@huggingface/transformers", "@mlc-ai/web-llm"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
