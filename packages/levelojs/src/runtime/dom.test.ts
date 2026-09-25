import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, unmount, setBridgeFactory } from "./dom.js";
import { h } from "./jsx-runtime.js";
import { state, computed, cleanup } from "./reactivity/index.js";
import type { NativeRendererBridge } from "./renderer/native/NativeRendererBridge.js";
import type { NativeOperation } from "./renderer/native/NativeOperationBridge.js";
import type { DomPatch } from "./renderer/platforms/web/DomPatch.js";

/**
 * Mock bridge that records operations and produces patches directly,
 * mirroring what the Rust core would produce. Tests use this so they
 * do not depend on the WASM module.
 */
function createMockBridge(): NativeRendererBridge & {
  operations: NativeOperation[][];
} {
  const operations: NativeOperation[][] = [];

  return {
    operations,

    execute(batch: readonly NativeOperation[]): DomPatch[] {
      operations.push([...batch]);

      const patches: DomPatch[] = [];

      for (const op of batch) {
        switch (op.type) {
          case "CreateElement":
            patches.push({
              type: "CreateElement",
              node: op.node,
              tag: op.elementType,
            });
            break;

          case "CreateText":
            patches.push({
              type: "CreateText",
              node: op.node,
              text: op.text,
            });
            break;

          case "AppendChild":
            patches.push({
              type: "AppendChild",
              parent: op.parent,
              child: op.child,
            });
            break;

          case "InsertBefore":
            patches.push({
              type: "InsertBefore",
              parent: op.parent,
              child: op.child,
              reference: op.reference,
            });
            break;

          case "ReplaceChild":
            patches.push({
              type: "ReplaceChild",
              parent: op.parent,
              newChild: op.newChild,
              oldChild: op.oldChild,
            });
            break;

          case "RemoveChild":
            patches.push({
              type: "RemoveChild",
              parent: op.parent,
              child: op.child,
            });
            break;

          case "DeleteNode":
            patches.push({ type: "DeleteNode", node: op.node });
            break;

          case "SetProperty":
            patches.push({
              type: "SetProperty",
              node: op.node,
              name: op.name,
              value: op.value,
            });
            break;

          case "RemoveProperty":
            patches.push({
              type: "RemoveProperty",
              node: op.node,
              name: op.name,
            });
            break;

          case "SetStyle":
            patches.push({
              type: "SetStyle",
              node: op.node,
              name: op.name,
              value: op.value,
            });
            break;

          case "RemoveStyle":
            patches.push({
              type: "RemoveStyle",
              node: op.node,
              name: op.name,
            });
            break;

          case "SetText":
            patches.push({
              type: "SetText",
              node: op.node,
              text: op.text,
            });
            break;
        }
      }

      return patches;
    },

    dispose() {
      // No-op for the mock.
    },
  };
}

/**
 * Flushes the microtask queue so the queued render executes.
 *
 * The bridge factory resolves on the first microtask; `.then(...)` runs on
 * the second. Two awaits cover both.
 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

let container: HTMLElement;
let bridge: ReturnType<typeof createMockBridge>;

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);

  bridge = createMockBridge();

  setBridgeFactory(async () => bridge);
});

afterEach(() => {
  setBridgeFactory(null);
});

describe("render", () => {
  it("mounts a static element tree", async () => {
    render(
      () => h("div", null, h("span", null, "Hello")),
      container,
    );

    await flush();

    expect(container.querySelector("div")).not.toBeNull();
    expect(container.querySelector("span")?.textContent).toBe("Hello");
  });

  it("mounts component functions", async () => {
    function App() {
      return h("h1", null, "Title");
    }

    render(App, container);
    await flush();

    expect(container.querySelector("h1")?.textContent).toBe("Title");
  });

  it("throws if the container already has a mounted tree", async () => {
    render(() => h("div", null), container);
    await flush();

    expect(() => render(() => h("div", null), container)).toThrow(
      /already mounted/i,
    );
  });

  it("throws if the input is not a Levelo element", () => {
    expect(() =>
      render("not an element" as unknown as () => never, container),
    ).toThrow(/Levelo element|component function/i);
  });

  it("throws if the container is null", () => {
    expect(() => render(() => h("div", null), null)).toThrow(
      /requires a valid DOM container/i,
    );
  });
});

describe("unmount", () => {
  it("removes the mounted tree from the container", async () => {
    render(() => h("div", { id: "test" }, "content"), container);
    await flush();

    expect(container.querySelector("#test")).not.toBeNull();

    unmount(container);

    expect(container.querySelector("#test")).toBeNull();
  });

  it("allows re-rendering after unmount", async () => {
    render(() => h("div", null, "first"), container);
    await flush();

    unmount(container);

    render(() => h("div", null, "second"), container);
    await flush();

    expect(container.textContent).toBe("second");
  });

  it("is a no-op when the container is not mounted", () => {
    expect(() => unmount(container)).not.toThrow();
    expect(() => unmount(null)).not.toThrow();
  });
});

describe("reactive rendering", () => {
  it("updates text when a signal changes", async () => {
    const [count, setCount] = state(0);

    function Counter() {
      return h("div", null, () => String(count()));
    }

    render(Counter, container);
    await flush();

    expect(container.textContent).toBe("0");

    setCount(5);
    expect(container.textContent).toBe("5");
  });

  it("removes the effect when unmounted", async () => {
    const [count, setCount] = state(0);

    function Counter() {
      return h("div", null, () => String(count()));
    }

    render(Counter, container);
    await flush();

    expect(container.textContent).toBe("0");

    unmount(container);

    expect(() => setCount(1)).not.toThrow();
    expect(container.textContent).toBe("");
  });
});

describe("component-scoped ownership", () => {
  it("disposes computed effects on unmount", async () => {
    const [count, setCount] = state(0);
    const computeFn = vi.fn(() => count() * 2);

    function Counter() {
      const doubled = computed(computeFn);
      return h("div", null, () => String(doubled()));
    }

    render(Counter, container);
    await flush();

    expect(container.textContent).toBe("0");

    setCount(5);
    expect(container.textContent).toBe("10");

    computeFn.mockClear();
    unmount(container);
    setCount(10);

    expect(computeFn).not.toHaveBeenCalled();
  });

  it("runs user cleanups registered inside a component", async () => {
    const spy = vi.fn();

    function App() {
      cleanup(spy);
      return h("div", null, "content");
    }

    render(App, container);
    await flush();

    expect(spy).not.toHaveBeenCalled();

    unmount(container);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("runs multiple cleanups in registration order", async () => {
    const calls: number[] = [];

    function App() {
      cleanup(() => calls.push(1));
      cleanup(() => calls.push(2));
      cleanup(() => calls.push(3));
      return h("div", null);
    }

    render(App, container);
    await flush();

    unmount(container);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("does not run cleanups twice if unmount is called again", async () => {
    const spy = vi.fn();

    function App() {
      cleanup(spy);
      return h("div", null);
    }

    render(App, container);
    await flush();

    unmount(container);
    expect(spy).toHaveBeenCalledTimes(1);

    unmount(container);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("survives a cleanup that throws", async () => {
    const good = vi.fn();

    function App() {
      cleanup(() => {
        throw new Error("boom");
      });
      cleanup(good);
      return h("div", null);
    }

    render(App, container);
    await flush();

    expect(() => unmount(container)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });
});