import type { InternalRenderNode } from "levelojs";

declare namespace JSX {
  type Element = InternalRenderNode;

  interface IntrinsicElements {
    [elemName: string]: Record<string, any>;
  }
}
