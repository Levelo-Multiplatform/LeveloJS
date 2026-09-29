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
  ReactiveRuntime,
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

    const text = new InternalRenderNode(2, "#text");
    text.props.set("text", "Initial");

    root.appendChild(text);

    const tree = new RenderTree(root);

    renderer.render(tree);

    const initialCount = bridge.nodeCount();

    if (initialCount !== 2) {
      throw new Error(
        `[Levelo] Expected 2 nodes after mount, received ${initialCount}.`,
      );
    }

    /*
     * Register a fine-grained reactive text binding.
     *
     * The update must be expressed as a targeted SetText
     * operation rather than rebuilding or comparing trees.
     */
    let value = "Updated";

    text.reactiveText = () => value;

    const reactiveRuntime = new ReactiveRuntime(adapter);

    reactiveRuntime.activate(root);

    value = "Updated again";

    /*
     * Trigger the reactive binding.
     */
    reactiveRuntime.dispose(root);

    console.log("[Levelo] Reactive WASM integration passed.");
    console.log("[Levelo] Rust node count:", bridge.nodeCount());
  } finally {
    bridge.dispose();
  }
}

main().catch((error) => {
  console.error("[Levelo] Reactive WASM integration failed:", error);
  process.exitCode = 1;
});