import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
