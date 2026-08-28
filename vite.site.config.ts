import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  publicDir: "../public",
  build: {
    outDir: "../dist/site",
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "site/index.html"),
        demo: resolve(import.meta.dirname, "site/demo/index.html"),
        help: resolve(import.meta.dirname, "site/help/index.html"),
        privacy: resolve(import.meta.dirname, "site/privacy/index.html"),
        terms: resolve(import.meta.dirname, "site/terms/index.html")
      }
    }
  },
  server: { port: 4173, strictPort: true }
});
