import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class CreateTextExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.CreateText>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.CreateText>,
  ): void {

    const {
      target,
      payload,
    } = operation;

    const textNode = document.createTextNode(
      payload.text,
    );

    this.registry.register(
      target,
      textNode,
    );
  }
}