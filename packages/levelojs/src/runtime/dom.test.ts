import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, unmount } from "./dom.js";
import { h } from "./jsx-runtime.js";
import { state, computed, cleanup } from "./reactivity/index.js";

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});

describe("render", () => {
  it("mounts a static element tree", () => {
    render(
      () => h("div", null, h("span", null, "Hello")),
      container,
    );

    expect(container.querySelector("div")).not.toBeNull();
    expect(container.querySelector("span")?.textContent).toBe("Hello");
  });

  it("mounts component functions", () => {
    function App() {
      return h("h1", null, "Title");
    }

    render(App, container);

    expect(container.querySelector("h1")?.textContent).toBe("Title");
  });

  it("throws if the container already has a mounted tree", () => {
    render(() => h("div", null), container);

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
  it("removes the mounted tree from the container", () => {
    render(() => h("div", { id: "test" }, "content"), container);

    expect(container.querySelector("#test")).not.toBeNull();

    unmount(container);

    expect(container.querySelector("#test")).toBeNull();
  });

  it("allows re-rendering after unmount", () => {
    render(() => h("div", null, "first"), container);
    unmount(container);

    render(() => h("div", null, "second"), container);

    expect(container.textContent).toBe("second");
  });

  it("is a no-op when the container is not mounted", () => {
    expect(() => unmount(container)).not.toThrow();
    expect(() => unmount(null)).not.toThrow();
  });
});

describe("reactive rendering", () => {
  it("updates text when a signal changes", () => {
    const [count, setCount] = state(0);

    function Counter() {
      return h("div", null, () => String(count()));
    }

    render(Counter, container);

    expect(container.textContent).toBe("0");

    setCount(5);
    expect(container.textContent).toBe("5");
  });

  it("removes the effect when unmounted", () => {
    const [count, setCount] = state(0);

    function Counter() {
      return h("div", null, () => String(count()));
    }

    render(Counter, container);
    expect(container.textContent).toBe("0");

    unmount(container);

    // The container is now empty; updating the signal should not throw
    // or attempt to write to a detached node.
    expect(() => setCount(1)).not.toThrow();
    expect(container.textContent).toBe("");
  });
});

describe("component-scoped ownership", () => {
  it("disposes computed effects on unmount", () => {
    const [count, setCount] = state(0);

    function Counter() {
      const doubled = computed(() => count() * 2);

      return h("div", null, () => String(doubled()));
    }

    render(Counter, container);

    expect(container.textContent).toBe("0");

    setCount(5);
    expect(container.textContent).toBe("10");

    unmount(container);

    // The computed's effect is now disposed. Updating the signal should
    // not throw and should not attempt to touch the detached node.
    expect(() => setCount(10)).not.toThrow();
    expect(container.textContent).toBe("");
  });

  it("runs user cleanups registered inside a component", () => {
    const spy = vi.fn();

    function App() {
      cleanup(spy);

      return h("div", null, "content");
    }

    render(App, container);
    expect(spy).not.toHaveBeenCalled();

    unmount(container);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("runs multiple cleanups in registration order", () => {
    const calls: number[] = [];

    function App() {
      cleanup(() => calls.push(1));
      cleanup(() => calls.push(2));
      cleanup(() => calls.push(3));

      return h("div", null);
    }

    render(App, container);
    unmount(container);

    expect(calls).toEqual([1, 2, 3]);
  });

  it("does not run cleanups twice if unmount is called again", () => {
    const spy = vi.fn();

    function App() {
      cleanup(spy);
      return h("div", null);
    }

    render(App, container);
    unmount(container);

    expect(spy).toHaveBeenCalledTimes(1);

    unmount(container);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("survives a cleanup that throws", () => {
    const good = vi.fn();

    function App() {
      cleanup(() => {
        throw new Error("boom");
      });
      cleanup(good);

      return h("div", null);
    }

    render(App, container);

    // Should not throw — disposeOwner catches per-cleanup errors.
    expect(() => unmount(container)).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });
});