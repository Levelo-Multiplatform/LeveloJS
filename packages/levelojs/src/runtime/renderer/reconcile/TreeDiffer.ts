import { RenderTree } from "../tree/RenderTree.js";
import { RenderTreeSnapshot } from "../snapshot/RenderTreeSnapshot.js";
import { OperationBatch } from "../tree/operations/index.js";

export interface TreeDiffer {

  diff(
    previous: RenderTreeSnapshot | null,
    current: RenderTree,
  ): OperationBatch;

}