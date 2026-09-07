import { PlatformAdapter } from "../platforms/PlatformAdapter.js";
import { OperationBatch } from "../tree/operations/index.js";

export interface RenderPipelineContext {
  readonly batch: OperationBatch;
  readonly adapter: PlatformAdapter;
}
