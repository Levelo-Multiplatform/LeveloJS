import { RenderPipelineContext } from "./RenderPipelineContext.js";

export interface PipelineStage {
  readonly name: string;
  run(context: RenderPipelineContext): void;
}
