import {
  OperationType,
  RenderOperation,
} from "../tree/operations/index.js";

/**
 * Values that can safely cross the TypeScript/Rust boundary.
 */
export type NativeValue =
  | null
  | boolean
  | number
  | string
  | NativeValue[]
  | { [key: string]: NativeValue };

/**
 * Platform-neutral operation data understood by the native core.
 *
 * Event handlers are intentionally excluded because JavaScript functions
 * cannot be transferred directly into Rust.
 */
export type NativeOperation =
  | {
      type: "CreateElement";
      node: number;
      elementType: string;
    }
  | {
      type: "CreateText";
      node: number;
      text: string;
    }
  | {
      type: "AppendChild";
      parent: number;
      child: number;
    }
  | {
      type: "InsertBefore";
      parent: number;
      child: number;
      reference: number;
    }
  | {
      type: "ReplaceChild";
      parent: number;
      newChild: number;
      oldChild: number;
    }
  | {
      type: "RemoveChild";
      parent: number;
      child: number;
    }
  | {
      type: "DeleteNode";
      node: number;
    }
  | {
      type: "SetProperty";
      node: number;
      name: string;
      value: NativeValue;
    }
  | {
      type: "RemoveProperty";
      node: number;
      name: string;
    }
  | {
      type: "SetStyle";
      node: number;
      name: string;
      value: string;
    }
  | {
      type: "RemoveStyle";
      node: number;
      name: string;
    }
  | {
      type: "SetText";
      node: number;
      text: string;
    };

function toNativeValue(value: unknown): NativeValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toNativeValue);
  }

  if (typeof value === "object") {
    const result: Record<string, NativeValue> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = toNativeValue(nestedValue);
    }

    return result;
  }

  throw new TypeError(
    `[Levelo] Unsupported native value: ${typeof value}`,
  );
}

/**
 * Converts a TypeScript RenderOperation into platform-neutral native data.
 *
 * Returns null for operations that remain entirely in the JavaScript
 * platform layer, such as event listener management.
 */
export function translateOperation(
  operation: RenderOperation,
): NativeOperation | null {
  switch (operation.type) {
    case OperationType.CreateElement:
      return {
        type: "CreateElement",
        node: operation.target,
        elementType: operation.payload.type,
      };

    case OperationType.CreateText:
      return {
        type: "CreateText",
        node: operation.target,
        text: operation.payload.text,
      };

    case OperationType.AppendChild:
      return {
        type: "AppendChild",
        parent: operation.target,
        child: operation.payload.childId,
      };

    case OperationType.InsertBefore:
      return {
        type: "InsertBefore",
        parent: operation.target,
        child: operation.payload.childId,
        reference: operation.payload.beforeChildId,
      };

    case OperationType.ReplaceChild:
      return {
        type: "ReplaceChild",
        parent: operation.target,
        newChild: operation.payload.newChildId,
        oldChild: operation.payload.oldChildId,
      };

    case OperationType.RemoveChild:
      return {
        type: "RemoveChild",
        parent: operation.target,
        child: operation.payload.childId,
      };

    case OperationType.DeleteNode:
      return {
        type: "DeleteNode",
        node: operation.target,
      };

    case OperationType.SetProperty:
      return {
        type: "SetProperty",
        node: operation.target,
        name: operation.payload.key,
        value: toNativeValue(operation.payload.value),
      };

    case OperationType.RemoveProperty:
      return {
        type: "RemoveProperty",
        node: operation.target,
        name: operation.payload.key,
      };

    case OperationType.SetStyle:
      return {
        type: "SetStyle",
        node: operation.target,
        name: operation.payload.property,
        value: String(operation.payload.value),
      };

    case OperationType.RemoveStyle:
      return {
        type: "RemoveStyle",
        node: operation.target,
        name: operation.payload.property,
      };

    case OperationType.SetText:
      return {
        type: "SetText",
        node: operation.target,
        text: operation.payload.text,
      };

    case OperationType.AddEventListener:
    case OperationType.RemoveEventListener:
      return null;
  }
}