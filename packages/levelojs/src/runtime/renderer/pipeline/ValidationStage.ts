import { PipelineStage } from "./PipelineStage.js";
import { RenderPipelineContext } from "./RenderPipelineContext.js";

export class ValidationStage implements PipelineStage {
  readonly name = "validation";

  run(context: RenderPipelineContext): void {
    for (const operation of context.batch) {
      if (!Number.isInteger(operation.target) || operation.target < 1) {
        throw new Error(
          `[Levelo Renderer] Invalid operation target: ${operation.target}.`,
        );
      }
    }
  }
}
