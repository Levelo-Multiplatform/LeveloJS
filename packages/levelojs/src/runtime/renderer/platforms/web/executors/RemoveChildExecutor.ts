import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class RemoveChildExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.RemoveChild>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.RemoveChild>,
  ): void {

    const parent =
      this.registry.resolve<Node>(
        operation.target,
      );

    const child =
      this.registry.resolve<Node>(
        operation.payload.childId,
      );

    parent.removeChild(
      child,
    );
  }
}