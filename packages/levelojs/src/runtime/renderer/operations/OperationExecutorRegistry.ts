import { OperationType, RenderOperation } from "../tree/operations/index.js";

export interface OperationExecutor<T extends RenderOperation = RenderOperation> {
  execute(operation: T): void;
}

export interface OperationExecutorRegistry {
  register<T extends RenderOperation>(
    type: OperationType,
    executor: OperationExecutor<T>,
  ): void;

  execute(operation: RenderOperation): void;
}
