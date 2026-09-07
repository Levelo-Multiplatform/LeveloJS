import {
  OperationType,
  RenderOperation,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";


export class SetTextExecutor
  implements WebOperationExecutor {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperation,
  ): void {

    if (
      operation.type !== OperationType.SetText
    ) {
      return;
    }

    const node =
      this.registry.resolve<Node>(
        operation.target,
      );

    node.textContent =
      operation.payload.text;
  }

}