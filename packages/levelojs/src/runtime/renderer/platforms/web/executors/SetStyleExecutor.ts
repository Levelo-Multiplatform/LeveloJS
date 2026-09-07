import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class SetStyleExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.SetStyle>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.SetStyle>,
  ): void {

    const element =
      this.registry.resolve<HTMLElement | SVGElement>(
        operation.target,
      );

    const {
      property,
      value,
    } = operation.payload;

    /*
     * ------------------------------------------------------------
     * Ignore invalid / empty property names.
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
     * null / undefined
     * ------------------------------------------------------------
     *
     * Treat these as removing the CSS property.
     */

    if (
      value === null ||
      value === undefined
    ) {
      element.style.removeProperty(
        normalizeStyleProperty(property),
      );

      return;
    }


    /*
     * ------------------------------------------------------------
     * CSS custom properties
     *
     * Example:
     *
     *   --primary-color
     *   --spacing
     * ------------------------------------------------------------
     */

    const cssProperty =
      normalizeStyleProperty(property);


    /*
     * ------------------------------------------------------------
     * !important
     * ------------------------------------------------------------
     *
     * Support:
     *
     *   color: "red !important"
     */

    const stringValue =
      String(value).trim();

    const important =
      /!important\s*$/i.test(
        stringValue,
      );


    if (important) {

      const cleanValue =
        stringValue
          .replace(
            /\s*!important\s*$/i,
            "",
          )
          .trim();

      element.style.setProperty(
        cssProperty,
        cleanValue,
        "important",
      );

      return;
    }


    /*
     * ------------------------------------------------------------
     * Normal CSS property
     * ------------------------------------------------------------
     */

    element.style.setProperty(
      cssProperty,
      stringValue,
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
 *   fontSize        -> font-size
 *
 * CSS custom properties beginning with "--" are preserved.
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