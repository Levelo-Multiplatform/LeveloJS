import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class AppendChildExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.AppendChild>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.AppendChild>,
  ): void {

    const parent =
      this.registry.resolve<Node>(
        operation.target,
      );

    const child =
      this.registry.resolve<Node>(
        operation.payload.childId,
      );

    parent.appendChild(
      child,
    );
  }
}