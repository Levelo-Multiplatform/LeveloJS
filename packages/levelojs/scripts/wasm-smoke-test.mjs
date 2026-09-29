import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LeveloWasmBridge } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const wasmPath = path.resolve(
    __dirname,
    "../../../native/levelo-bindings/wasm/pkg/levelo_wasm_bg.wasm",
  );

  const wasmBytes = await fs.readFile(wasmPath);

  const bridge = new LeveloWasmBridge();

  try {
    await bridge.initialize(wasmBytes);

    bridge.execute([
      // Creation
      {
        type: "CreateElement",
        node: 1,
        elementType: "div",
      },
      {
        type: "CreateText",
        node: 2,
        text: "Hello from Rust",
      },

      // Tree structure
      {
        type: "AppendChild",
        parent: 1,
        child: 2,
      },

      // Property
      {
        type: "SetProperty",
        node: 1,
        name: "id",
        value: "app",
      },

      // Style
      {
        type: "SetStyle",
        node: 1,
        name: "color",
        value: "red",
      },

      // Text update
      {
        type: "SetText",
        node: 2,
        text: "Hello from Levelo Rust",
      },

      // Property removal
      {
        type: "RemoveProperty",
        node: 1,
        name: "id",
      },

      // Style removal
      {
        type: "RemoveStyle",
        node: 1,
        name: "color",
      },

      // Tree removal
      {
        type: "RemoveChild",
        parent: 1,
        child: 2,
      },

      // Node cleanup
      {
        type: "DeleteNode",
        node: 2,
      },
      {
        type: "DeleteNode",
        node: 1,
      },
    ]);

    console.log("[Levelo] Full WASM operation pipeline passed.");
    console.log("[Levelo] Rust node count:", bridge.nodeCount());
  } finally {
    bridge.dispose();
  }
}

main().catch((error) => {
  console.error("[Levelo] WASM smoke test failed:", error);
  process.exitCode = 1;
});