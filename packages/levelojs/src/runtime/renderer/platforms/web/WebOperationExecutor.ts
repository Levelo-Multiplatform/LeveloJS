import { RenderOperation } from "../../tree/operations/index.js";
import { OperationExecutor } from "../../operations/OperationExecutorRegistry.js";

export type WebOperationExecutor<T extends RenderOperation = RenderOperation> =
  OperationExecutor<T>;
