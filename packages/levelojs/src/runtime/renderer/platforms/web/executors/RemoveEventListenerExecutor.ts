import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class RemoveEventListenerExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.RemoveEventListener>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.RemoveEventListener>,
  ): void {

    const element =
      this.registry.resolve<HTMLElement>(
        operation.target,
      );

    const {
      event,
      handler,
      options,
    } = operation.payload;

    element.removeEventListener(
      event,
      handler,
      options,
    );
  }
}