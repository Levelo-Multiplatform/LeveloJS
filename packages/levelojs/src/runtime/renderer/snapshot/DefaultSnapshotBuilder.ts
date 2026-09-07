import {
  RenderTree,
} from "../tree/RenderTree.js";

import {
  InternalRenderNode,
} from "../tree/InternalRenderNode.js";

import {
  NodeSnapshot,
} from "./NodeSnapshot.js";

import {
  RenderTreeSnapshot,
} from "./RenderTreeSnapshot.js";

export class DefaultSnapshotBuilder {

  build(
    tree: RenderTree,
  ): RenderTreeSnapshot {

    return new RenderTreeSnapshot(
      this.buildNode(
        tree.root,
      ),
    );
  }

  private buildNode(
    node: InternalRenderNode,
  ): NodeSnapshot {

    return new NodeSnapshot(
      node.id,
      node.type,

      new Map(
        node.props,
      ),

      new Map(
        node.styles,
      ),

      new Map(
        node.events,
      ),

      node.children.map(
        child =>
          this.buildNode(
            child,
          ),
      ),
    );
  }
}