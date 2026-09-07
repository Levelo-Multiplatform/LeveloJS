import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class ReplaceChildExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.ReplaceChild>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.ReplaceChild>,
  ): void {

    const parent =
      this.registry.resolve<Node>(
        operation.target,
      );

    const oldChild =
      this.registry.resolve<Node>(
        operation.payload.oldChildId,
      );

    const newChild =
      this.registry.resolve<Node>(
        operation.payload.newChildId,
      );

    parent.replaceChild(
      newChild,
      oldChild,
    );
  }
}