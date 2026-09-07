import { OperationBatch } from "../tree/operations/index.js";

/** Commit boundary. Validation and platform execution are handled by the pipeline. */
export class CommitCoordinator {
  commit(batch: OperationBatch): OperationBatch {
    return batch;
  }
}
