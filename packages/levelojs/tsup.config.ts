import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "jsx-runtime": "src/jsx-runtime.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    external: [
      "@babel/core",
      "@babel/plugin-syntax-jsx",
      "vite",
      "@babel/types",
      "@babel/plugin-transform-typescript",
      "levelojs/wasm",
    ],
  },
]);