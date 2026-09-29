import type { InternalRenderNode } from "levelojs";

declare global {
  namespace JSX {
    type Element = InternalRenderNode;

    interface IntrinsicElements {
      [elemName: string]: Record<string, any>;
    }
  }
}

export {};