import { CommitCoordinator } from "../commit/CommitCoordinator.js";
import { PipelineStage } from "./PipelineStage.js";
import { RenderPipelineContext } from "./RenderPipelineContext.js";

export class CommitStage implements PipelineStage {
  readonly name = "commit";

  constructor(private readonly coordinator: CommitCoordinator) {}

  run(context: RenderPipelineContext): void {
    const batch = this.coordinator.commit(context.batch);
    context.adapter.execute(batch);
  }
}
