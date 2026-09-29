import { describe, it, expect } from "vitest";
import { h } from "../../jsx-runtime.js";
import { state } from "../reactivity/index.js";
import type { InternalRenderNode } from "./tree/InternalRenderNode.js";

describe("fine-grained reactivity", () => {
  it("does not re-execute the component function on signal change", () => {
    let renderCount = 0;

    function Counter() {
      renderCount++;
      const [count, setCount] = state(0);

      return h(
        "div",
        {},
        h("span", {}, () => String(count())),
        h(
          "button",
          { onClick: () => setCount(count() + 1) },
          "Increment",
        ),
      ) as InternalRenderNode;
    }

    // Build the tree once. This runs Counter exactly one time.
    const tree = h(Counter as any, {});

    // The component ran exactly once during h().
    expect(renderCount).toBe(1);

    // Locate the span and its text-node child.
    const span = tree.children.find((c) => c.type === "span") as InternalRenderNode;
    expect(span).toBeDefined();
    expect(span.children.length).toBe(1);

    const textNode = span.children[0];
    // The reactive binding was attached to the text node.
    expect(textNode.reactiveText).toBeTypeOf("function");
    expect(textNode.reactiveText!()).toBe("0");

    // Locate the button and invoke its click handler.
    const button = tree.children.find((c) => c.type === "button") as InternalRenderNode;
    const clickHandler = button.events.get("click") as () => void;
    expect(clickHandler).toBeTypeOf("function");
    clickHandler();

    // The signal updated, and the text node's getter reflects the new value.
    expect(textNode.reactiveText!()).toBe("1");

    // The key assertion: the component function was not invoked again.
    expect(renderCount).toBe(1);
  });
});