import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeveloWasmBridge } from "./LeveloWasmBridge.js";
import type { NativeOperation } from "./NativeOperationBridge.js";

/**
 * A fake WASM module that mimics the shape wasm-bindgen generates.
 *
 * We can't import the real `levelo_wasm.js` in a Node test environment
 * because it uses `import.meta.url` and references a `.wasm` binary. This
 * mock has the same interface, so the bridge's control flow can be
 * tested in isolation.
 */
function createMockWasmModule() {
  const executeCalls: unknown[][] = [];
  const instance = {
    execute_batch: vi.fn((ops: unknown[]) => {
      executeCalls.push(ops);
    }),
    node_count: vi.fn(() => 42),
    free: vi.fn(),
  };

  const init = vi.fn(async () => {});

  return {
    module: {
      default: init,
      WasmRenderer: vi.fn(function (this: unknown) {
        return instance;
      }),
    },
    init,
    instance,
    executeCalls,
  };
}

/**
 * The bridge uses a dynamic import to load the WASM module. We can't
 * intercept that easily, so instead we reach into the bridge's private
 * state after mocking the global loader.
 *
 * This test works by monkey-patching `initialize()` to skip the dynamic
 * import and inject a mock module directly. The rest of the bridge's
 * behavior (execute, dispose, nodeCount) is tested as-is.
 */
function createBridgeWithMockModule() {
  const mock = createMockWasmModule();
  const bridge = new LeveloWasmBridge();

  // Bypass the real initialize() — it uses a dynamic import we can't
  // easily mock. Directly set the internal state as if initialize() had
  // succeeded with our mock module.
  const instance = new (mock.module.WasmRenderer as any)();

  (bridge as unknown as {
    renderer: typeof instance;
    initialized: boolean;
  }).renderer = instance;

  (bridge as unknown as {
    renderer: typeof instance;
    initialized: boolean;
  }).initialized = true;

  return { bridge, ...mock };
}

describe("LeveloWasmBridge", () => {
  let bridge: LeveloWasmBridge;
  let instance: ReturnType<typeof createMockWasmModule>["instance"];
  let executeCalls: ReturnType<typeof createMockWasmModule>["executeCalls"];

  beforeEach(() => {
    const built = createBridgeWithMockModule();
    bridge = built.bridge;
    instance = built.instance;
    executeCalls = built.executeCalls;
  });

  it("forwards a batch of operations to the underlying renderer", () => {
    const operations: NativeOperation[] = [
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "CreateText", node: 2, text: "hello" },
      { type: "AppendChild", parent: 1, child: 2 },
    ];

    bridge.execute(operations);

    expect(instance.execute_batch).toHaveBeenCalledTimes(1);
    expect(executeCalls[0]).toEqual(operations);
  });

  it("copies the operations array before passing it to WASM", () => {
    const operations: NativeOperation[] = [
      { type: "CreateElement", node: 1, elementType: "div" },
    ];
    const readonlyOps = operations as readonly NativeOperation[];

    bridge.execute(readonlyOps);

    // The array the bridge sends should not be the same reference.
    expect(executeCalls[0]).not.toBe(readonlyOps);
    expect(executeCalls[0]).toEqual(operations);
  });

  it("forwards an empty array without error", () => {
    bridge.execute([]);

    expect(instance.execute_batch).toHaveBeenCalledTimes(1);
    expect(executeCalls[0]).toEqual([]);
  });

  it("returns the node count from the underlying renderer", () => {
    expect(bridge.nodeCount()).toBe(42);
    expect(instance.node_count).toHaveBeenCalledTimes(1);
  });

  it("calls free() on dispose", () => {
    bridge.dispose();

    expect(instance.free).toHaveBeenCalledTimes(1);
  });

  it("clears internal state on dispose", () => {
    bridge.dispose();

    expect(() => bridge.execute([])).toThrow(/must be initialized/);
    expect(() => bridge.nodeCount()).toThrow(/must be initialized/);
  });

  it("throws when executing before initialization", () => {
    const freshBridge = new LeveloWasmBridge();

    expect(() => freshBridge.execute([])).toThrow(/must be initialized/);
  });

  it("throws when reading node count before initialization", () => {
    const freshBridge = new LeveloWasmBridge();

    expect(() => freshBridge.nodeCount()).toThrow(/must be initialized/);
  });

  it("is idempotent on dispose", () => {
    bridge.dispose();
    bridge.dispose();

    // free() should only be called once because the second dispose
    // sees renderer === null and returns early.
    expect(instance.free).toHaveBeenCalledTimes(1);
  });
});