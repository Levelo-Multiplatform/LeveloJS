import { InternalRenderNode } from "./InternalRenderNode.js";

export class RenderTree {

  constructor(
    private readonly rootNode:
      InternalRenderNode,
  ) {}

  get root():
    InternalRenderNode {

    return this.rootNode;
  }

}