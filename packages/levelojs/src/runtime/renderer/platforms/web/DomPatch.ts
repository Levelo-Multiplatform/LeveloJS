/**
 * Platform-neutral DOM patches emitted by the Levelo core.
 *
 * Each patch describes one concrete change a platform adapter should apply
 * to its native surface. Patches are returned by `WasmRenderer.execute_batch`
 * in the same order the operations were submitted, and the adapter applies
 * them sequentially.
 *
 * The shape of each variant matches the object built by the Rust-side
 * `dom_patch_to_js_value` helper in `native/levelo-bindings/wasm/src/lib.rs`.
 * Node IDs are plain numbers (`f64` on the Rust side).
 */
export type DomPatch =
  | {
      type: "CreateElement";
      node: number;
      tag: string;
    }
  | {
      type: "CreateText";
      node: number;
      text: string;
    }
  | {
      type: "SetProperty";
      node: number;
      name: string;
      value: unknown;
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
      type: "RemoveChild";
      parent: number;
      child: number;
    }
  | {
      type: "ReplaceChild";
      parent: number;
      newChild: number;
      oldChild: number;
    }
  | {
      type: "DeleteNode";
      node: number;
    };