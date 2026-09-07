import { InternalRenderNode } from "../tree/InternalRenderNode.js";
import { NodeSnapshot } from "../snapshot/NodeSnapshot.js";
import { RenderOperation } from "../tree/operations/index.js";

export interface NodeDiffer {

  diff(
    previous: NodeSnapshot | null,
    current: InternalRenderNode,
  ): readonly RenderOperation[];

}