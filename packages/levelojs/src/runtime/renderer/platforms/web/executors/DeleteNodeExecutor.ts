import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";
import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class DeleteNodeExecutor
  implements WebOperationExecutor<RenderOperationOf<OperationType.DeleteNode>> {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.DeleteNode>,
  ): void {
    this.registry.remove(operation.target);
  }
}
