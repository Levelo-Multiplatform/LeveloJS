import { defineConfig } from "vite";
import { leveloPlugin } from "vite-plugin-levelojs";

export default defineConfig({
  plugins: [leveloPlugin()],
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