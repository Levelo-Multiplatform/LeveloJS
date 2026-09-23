/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

/**
 * Integration test for the real WASM module.
 *
 * Loads the compiled `levelo_wasm.js` from `dist/wasm/` directly, bypassing
 * the bridge's dynamic import trick so the test runs in Node without a
 * browser. Exercises the full JS → NativeOperation → Rust pipeline.
 *
 * Prerequisites:
 *
 *   - `npm run build` has been run at least once, so `dist/wasm/` exists.
 *   - `process.cwd()` is `packages/levelojs` (true when run via `npm test`).
 */

interface WasmInitInput {
  module_or_path?: unknown;
}

interface WasmModule {
  default: (input?: WasmInitInput) => Promise<unknown>;
  WasmRenderer: new () => {
    execute_batch(operations: unknown[]): void;
    node_count(): number;
    free(): void;
  };
}

const wasmDir = resolve(process.cwd(), "dist/wasm");
const wasmPath = resolve(wasmDir, "levelo_wasm.js");
const wasmBinaryPath = resolve(wasmDir, "levelo_wasm_bg.wasm");

let module: WasmModule;

beforeAll(async () => {
  module = (await import(pathToFileURL(wasmPath).href)) as WasmModule;

  // Pass the .wasm binary directly. wasm-bindgen's default loader uses
  // `fetch()` on a `file://` URL, which is unreliable in Node. Supplying
  // the raw bytes bypasses that path entirely.
  //
  // wasm-bindgen 0.2.95+ expects an options object rather than a bare
  // BufferSource argument.
  const wasmBinary = readFileSync(wasmBinaryPath);

  await module.default({ module_or_path: wasmBinary });
});

describe("real WASM module", () => {
  it("initializes without error", () => {
    expect(module.WasmRenderer).toBeDefined();
  });

  it("tracks a single created element", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
    ]);

    expect(renderer.node_count()).toBe(1);

    renderer.free();
  });

  it("tracks a parent with an appended child", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "CreateText", node: 2, text: "hello" },
      { type: "AppendChild", parent: 1, child: 2 },
    ]);

    expect(renderer.node_count()).toBe(2);

    renderer.free();
  });

  it("accepts a SetProperty operation", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "input" },
      { type: "SetProperty", node: 1, name: "type", value: "text" },
      { type: "SetProperty", node: 1, name: "disabled", value: true },
    ]);

    expect(renderer.node_count()).toBe(1);

    renderer.free();
  });

  it("accepts a SetStyle operation", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "SetStyle", node: 1, name: "color", value: "red" },
    ]);

    expect(renderer.node_count()).toBe(1);

    renderer.free();
  });

  it("deletes a node", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "DeleteNode", node: 1 },
    ]);

    expect(renderer.node_count()).toBe(0);

    renderer.free();
  });

  it("rejects an unknown operation type", () => {
    const renderer = new module.WasmRenderer();

    expect(() =>
      renderer.execute_batch([
        { type: "ThisDoesNotExist", node: 1 },
      ]),
    ).toThrow(/Unsupported native operation/);

    renderer.free();
  });

  it("rejects an event operation that reaches the boundary", () => {
    const renderer = new module.WasmRenderer();

    expect(() =>
      renderer.execute_batch([
        { type: "AddEventListener", node: 1, event: "click" },
      ]),
    ).toThrow(/Event operations must remain on the JavaScript platform layer/);

    renderer.free();
  });
});