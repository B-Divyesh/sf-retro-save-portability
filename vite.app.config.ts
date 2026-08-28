import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
    sourcemap: true
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true }
});
