import { OperationBatch } from "../tree/operations/index.js";
import { PlatformAdapter } from "../platforms/PlatformAdapter.js";

export interface RenderPipeline {
  process(batch: OperationBatch, adapter: PlatformAdapter): void;
}
