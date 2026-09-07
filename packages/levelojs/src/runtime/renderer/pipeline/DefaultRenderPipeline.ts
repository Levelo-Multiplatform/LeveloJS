import { PlatformAdapter } from "../platforms/PlatformAdapter.js";
import { OperationBatch } from "../tree/operations/index.js";
import { PipelineStage } from "./PipelineStage.js";
import { RenderPipeline } from "./RenderPipeline.js";
import { RenderPipelineContext } from "./RenderPipelineContext.js";

export class DefaultRenderPipeline implements RenderPipeline {
  constructor(private readonly stages: readonly PipelineStage[]) {}

  process(batch: OperationBatch, adapter: PlatformAdapter): void {
    const context: RenderPipelineContext = { batch, adapter };

    for (const stage of this.stages) {
      stage.run(context);
    }
  }
}
