import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DefaultRenderer,
  InternalRenderNode,
  RenderTree,
  NativeAdapter,
  NativeRendererExecutor,
  LeveloWasmBridge,
} from "../dist/index.js";

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

    const executor = new NativeRendererExecutor(bridge);
    const adapter = new NativeAdapter(executor);
    const renderer = new DefaultRenderer(adapter);

    const root = new InternalRenderNode(1, "div");
    root.props.set("id", "app");
    root.styles.set("color", "red");

    const text = new InternalRenderNode(2, "#text");
    text.props.set("text", "Hello from Levelo");

    root.appendChild(text);

    const tree = new RenderTree(root);

    renderer.render(tree);

    const nodeCount = bridge.nodeCount();

    console.log("[Levelo] Renderer integration passed.");
    console.log("[Levelo] Rust node count:", nodeCount);

    renderer.dispose(tree);
    executor.dispose();

    if (nodeCount !== 2) {
      throw new Error(
        `[Levelo] Expected Rust node count to be 2, received ${nodeCount}.`,
      );
    }
  } finally {
    bridge.dispose();
  }
}

main().catch((error) => {
  console.error("[Levelo] Renderer integration failed:", error);
  process.exitCode = 1;
});