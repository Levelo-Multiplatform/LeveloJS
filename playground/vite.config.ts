import { defineConfig } from "vite";
import { leveloPlugin } from "vite-plugin-levelojs";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [leveloPlugin()],
  publicDir: resolve(__dirname, "../assets"),
  esbuild: {
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
  },
  server: {
    port: 6262,
    fs: {
      allow: [".."],
    },
  },
  optimizeDeps: {
    exclude: ["levelojs"],
  },
});