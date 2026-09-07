import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class InsertBeforeExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.InsertBefore>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.InsertBefore>,
  ): void {

    const parent =
      this.registry.resolve<Node>(
        operation.target,
      );

    const child =
      this.registry.resolve<Node>(
        operation.payload.childId,
      );

    const before =
      this.registry.resolve<Node>(
        operation.payload.beforeChildId,
      );

    parent.insertBefore(
      child,
      before,
    );
  }
}