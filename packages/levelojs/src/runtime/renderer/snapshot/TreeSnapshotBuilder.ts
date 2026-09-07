import { RenderTree } from "../tree/RenderTree.js";

import { RenderTreeSnapshot } from "./RenderTreeSnapshot.js";

export interface TreeSnapshotBuilder {

  build(
    tree: RenderTree,
  ): RenderTreeSnapshot;

}