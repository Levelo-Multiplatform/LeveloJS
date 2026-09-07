import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class RemoveStyleExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.RemoveStyle>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.RemoveStyle>,
  ): void {

    const element =
      this.registry.resolve<HTMLElement | SVGElement>(
        operation.target,
      );

    const property =
      operation.payload.property;


    /*
     * ------------------------------------------------------------
     * Ignore invalid property names.
     * ------------------------------------------------------------
     */

    if (
      !property ||
      typeof property !== "string"
    ) {
      return;
    }


    /*
     * ------------------------------------------------------------
     * Remove the normalized CSS property.
     * ------------------------------------------------------------
     */

    element.style.removeProperty(
      normalizeStyleProperty(property),
    );
  }
}


/* ================================================================
 * Convert JavaScript-style CSS names to CSS property names.
 *
 * Examples:
 *
 *   backgroundColor -> background-color
 *   marginTop       -> margin-top
 *
 * Custom properties remain unchanged.
 * ================================================================ */

function normalizeStyleProperty(
  property: string,
): string {

  if (
    property.startsWith("--")
  ) {
    return property;
  }

  return property.replace(
    /[A-Z]/g,
    (match) =>
      `-${match.toLowerCase()}`,
  );
}