/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

interface WasmRendererInstance {
  execute_batch(operations: unknown[]): void;
  node_count(): number;
  free(): void;
  get_node(id: number): {
    id: number;
    kind: string;
    parent: number | null;
    children: number[];
    properties: Record<string, unknown>;
    styles: Record<string, string>;
    text: string | null;
  };
  get_children(id: number): number[];
  root(): number;
  serialize(): {
    root: number;
    nodes: Record<string, { id: number; kind: string; text: string | null }>;
  };
}

interface WasmModule {
  WasmRenderer: new () => WasmRendererInstance;
}

const pkgNodeDir = resolve(
  process.cwd(),
  "../../native/levelo-bindings/wasm/pkg-node",
);

let module: WasmModule;

beforeAll(() => {
  const require = createRequire(import.meta.url);
  const path = resolve(pkgNodeDir, "levelo_wasm.js");

  module = require(path) as WasmModule;
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
      renderer.execute_batch([{ type: "ThisDoesNotExist", node: 1 }]),
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

describe("WASM query methods", () => {
  it("returns a full node snapshot", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "SetProperty", node: 1, name: "id", value: "app" },
      { type: "SetStyle", node: 1, name: "color", value: "red" },
    ]);

    const snapshot = renderer.get_node(1);

    expect(snapshot.id).toBe(1);
    expect(snapshot.kind).toBe("element");
    expect(snapshot.parent).toBeNull();
    expect(snapshot.children).toEqual([]);
    expect(snapshot.properties).toEqual({ id: "app" });
    expect(snapshot.styles).toEqual({ color: "red" });
    expect(snapshot.text).toBeNull();

    renderer.free();
  });

  it("returns children in order", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "CreateText", node: 2, text: "a" },
      { type: "CreateText", node: 3, text: "b" },
      { type: "AppendChild", parent: 1, child: 2 },
      { type: "AppendChild", parent: 1, child: 3 },
    ]);

    expect(renderer.get_children(1)).toEqual([2, 3]);

    renderer.free();
  });

  it("returns the root node ID", () => {
    const renderer = new module.WasmRenderer();

    expect(renderer.root()).toBe(0);

    renderer.execute_batch([
      { type: "CreateElement", node: 42, elementType: "div" },
    ]);

    expect(renderer.root()).toBe(42);

    renderer.free();
  });

  it("serializes the full tree", () => {
    const renderer = new module.WasmRenderer();

    renderer.execute_batch([
      { type: "CreateElement", node: 1, elementType: "div" },
      { type: "CreateText", node: 2, text: "hello" },
      { type: "AppendChild", parent: 1, child: 2 },
    ]);

    const snapshot = renderer.serialize();

    expect(snapshot.root).toBe(1);
    expect(Object.keys(snapshot.nodes).sort()).toEqual(["1", "2"]);
    expect(snapshot.nodes["1"].kind).toBe("element");
    expect(snapshot.nodes["2"].kind).toBe("text");
    expect(snapshot.nodes["2"].text).toBe("hello");

    renderer.free();
  });
});