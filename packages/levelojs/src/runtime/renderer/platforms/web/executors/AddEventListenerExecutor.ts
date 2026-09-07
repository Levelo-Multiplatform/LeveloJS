import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class AddEventListenerExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.AddEventListener>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.AddEventListener>,
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

    element.addEventListener(
      event,
      handler,
      options,
    );
  }
}