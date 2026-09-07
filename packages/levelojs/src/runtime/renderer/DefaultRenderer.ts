import { Renderer } from "./interfaces/Renderer.js";
import { RenderTree } from "./tree/RenderTree.js";
import { TreeSnapshotBuilder } from "./snapshot/TreeSnapshotBuilder.js";
import { RenderTreeSnapshot } from "./snapshot/RenderTreeSnapshot.js";
import { TreeDiffer } from "./reconcile/TreeDiffer.js";
import { PlatformAdapter } from "./platforms/PlatformAdapter.js";
import { RenderPipeline } from "./pipeline/RenderPipeline.js";
import { Scheduler } from "./scheduler/Scheduler.js";

export class DefaultRenderer implements Renderer {
  private previousSnapshot: RenderTreeSnapshot | null = null;

  constructor(
    private readonly adapter: PlatformAdapter,
    private readonly snapshotBuilder: TreeSnapshotBuilder,
    private readonly treeDiffer: TreeDiffer,
    private readonly pipeline: RenderPipeline,
    private readonly scheduler: Scheduler,
  ) {}

  render(tree: RenderTree): void {
    this.scheduler.schedule(() => {
      const operations = this.treeDiffer.diff(this.previousSnapshot, tree);
      this.pipeline.process(operations, this.adapter);
      this.previousSnapshot = this.snapshotBuilder.build(tree);
    });
  }
}
