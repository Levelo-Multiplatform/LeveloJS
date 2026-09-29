import { describe, it, expect } from "vitest";
import { translateOperation } from "./NativeOperationBridge.js";
import { translateOperationBatch } from "./NativeOperationBatch.js";
import {
  OperationType,
  RenderOperation,
} from "../tree/operations/index.js";
import { OperationBatch } from "../tree/operations/OperationBatch.js";

describe("translateOperation", () => {
  it("translates CreateElement", () => {
    const op: RenderOperation = {
      type: OperationType.CreateElement,
      target: 1,
      payload: { type: "div", props: { id: "x" } },
    };

    expect(translateOperation(op)).toEqual({
      type: "CreateElement",
      node: 1,
      elementType: "div",
    });
  });

  it("translates CreateText", () => {
    const op: RenderOperation = {
      type: OperationType.CreateText,
      target: 2,
      payload: { text: "hello" },
    };

    expect(translateOperation(op)).toEqual({
      type: "CreateText",
      node: 2,
      text: "hello",
    });
  });

  it("translates AppendChild", () => {
    const op: RenderOperation = {
      type: OperationType.AppendChild,
      target: 1,
      payload: { childId: 2 },
    };

    expect(translateOperation(op)).toEqual({
      type: "AppendChild",
      parent: 1,
      child: 2,
    });
  });

  it("translates InsertBefore", () => {
    const op: RenderOperation = {
      type: OperationType.InsertBefore,
      target: 1,
      payload: { childId: 2, beforeChildId: 3 },
    };

    expect(translateOperation(op)).toEqual({
      type: "InsertBefore",
      parent: 1,
      child: 2,
      reference: 3,
    });
  });

  it("translates ReplaceChild", () => {
    const op: RenderOperation = {
      type: OperationType.ReplaceChild,
      target: 1,
      payload: { newChildId: 2, oldChildId: 3 },
    };

    expect(translateOperation(op)).toEqual({
      type: "ReplaceChild",
      parent: 1,
      newChild: 2,
      oldChild: 3,
    });
  });

  it("translates RemoveChild", () => {
    const op: RenderOperation = {
      type: OperationType.RemoveChild,
      target: 1,
      payload: { childId: 2 },
    };

    expect(translateOperation(op)).toEqual({
      type: "RemoveChild",
      parent: 1,
      child: 2,
    });
  });

  it("translates DeleteNode", () => {
    const op: RenderOperation = {
      type: OperationType.DeleteNode,
      target: 5,
      payload: {},
    };

    expect(translateOperation(op)).toEqual({
      type: "DeleteNode",
      node: 5,
    });
  });

  it("translates SetProperty with primitive value", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: { key: "id", value: "app" },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetProperty",
      node: 1,
      name: "id",
      value: "app",
    });
  });

  it("translates SetProperty with boolean value", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: { key: "disabled", value: true },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetProperty",
      node: 1,
      name: "disabled",
      value: true,
    });
  });

  it("translates SetProperty with number value", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: { key: "tabIndex", value: 3 },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetProperty",
      node: 1,
      name: "tabIndex",
      value: 3,
    });
  });

  it("translates SetProperty with nested object value", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: {
        key: "data",
        value: { title: "hello", count: 3, tags: ["a", "b"] },
      },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetProperty",
      node: 1,
      name: "data",
      value: { title: "hello", count: 3, tags: ["a", "b"] },
    });
  });

  it("translates SetProperty with null value", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: { key: "value", value: null },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetProperty",
      node: 1,
      name: "value",
      value: null,
    });
  });

  it("translates RemoveProperty", () => {
    const op: RenderOperation = {
      type: OperationType.RemoveProperty,
      target: 1,
      payload: { key: "disabled" },
    };

    expect(translateOperation(op)).toEqual({
      type: "RemoveProperty",
      node: 1,
      name: "disabled",
    });
  });

  it("translates SetStyle", () => {
    const op: RenderOperation = {
      type: OperationType.SetStyle,
      target: 1,
      payload: { property: "color", value: "red" },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetStyle",
      node: 1,
      name: "color",
      value: "red",
    });
  });

  it("translates RemoveStyle", () => {
    const op: RenderOperation = {
      type: OperationType.RemoveStyle,
      target: 1,
      payload: { property: "color" },
    };

    expect(translateOperation(op)).toEqual({
      type: "RemoveStyle",
      node: 1,
      name: "color",
    });
  });

  it("translates SetText", () => {
    const op: RenderOperation = {
      type: OperationType.SetText,
      target: 2,
      payload: { text: "updated" },
    };

    expect(translateOperation(op)).toEqual({
      type: "SetText",
      node: 2,
      text: "updated",
    });
  });

  it("returns null for AddEventListener", () => {
    const op: RenderOperation = {
      type: OperationType.AddEventListener,
      target: 1,
      payload: { event: "click", handler: () => {} },
    };

    expect(translateOperation(op)).toBeNull();
  });

  it("returns null for RemoveEventListener", () => {
    const op: RenderOperation = {
      type: OperationType.RemoveEventListener,
      target: 1,
      payload: { event: "click", handler: () => {} },
    };

    expect(translateOperation(op)).toBeNull();
  });

  it("throws on unsupported value types", () => {
    const op: RenderOperation = {
      type: OperationType.SetProperty,
      target: 1,
      payload: { key: "fn", value: () => {} },
    };

    expect(() => translateOperation(op)).toThrow(/Unsupported native value/);
  });
});

describe("translateOperationBatch", () => {
  it("filters out event operations", () => {
    const batch = new OperationBatch([
      {
        type: OperationType.CreateElement,
        target: 1,
        payload: { type: "div" },
      },
      {
        type: OperationType.AddEventListener,
        target: 1,
        payload: { event: "click", handler: () => {} },
      },
      {
        type: OperationType.SetText,
        target: 2,
        payload: { text: "x" },
      },
    ]);

    const native = translateOperationBatch(batch);

    expect(native).toHaveLength(2);
    expect(native[0].type).toBe("CreateElement");
    expect(native[1].type).toBe("SetText");
  });

  it("preserves operation order", () => {
    const batch = new OperationBatch([
      {
        type: OperationType.CreateElement,
        target: 1,
        payload: { type: "div" },
      },
      {
        type: OperationType.CreateText,
        target: 2,
        payload: { text: "hello" },
      },
      {
        type: OperationType.AppendChild,
        target: 1,
        payload: { childId: 2 },
      },
    ]);

    const native = translateOperationBatch(batch);

    expect(native.map((op) => op.type)).toEqual([
      "CreateElement",
      "CreateText",
      "AppendChild",
    ]);
  });

  it("returns an empty array for an empty batch", () => {
    expect(translateOperationBatch(new OperationBatch([]))).toEqual([]);
  });

  it("returns an empty array when every operation is filtered out", () => {
    const batch = new OperationBatch([
      {
        type: OperationType.AddEventListener,
        target: 1,
        payload: { event: "click", handler: () => {} },
      },
    ]);

    expect(translateOperationBatch(batch)).toEqual([]);
  });
});