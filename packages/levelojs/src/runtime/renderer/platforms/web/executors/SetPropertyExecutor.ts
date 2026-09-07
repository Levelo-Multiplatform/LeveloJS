import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import { NativeNodeRegistry } from "../NativeNodeRegistry.js";
import { WebOperationExecutor } from "../WebOperationExecutor.js";

export class SetPropertyExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.SetProperty>
  > {

  constructor(
    private readonly registry: NativeNodeRegistry,
  ) {}

  execute(
    operation: RenderOperationOf<OperationType.SetProperty>,
  ): void {

    const element =
      this.registry.resolve<HTMLElement>(
        operation.target,
      );

    const {
      key,
      value,
    } = operation.payload;


    /*
     * ------------------------------------------------------------
     * Internal Levelo properties
     * ------------------------------------------------------------
     */

    if (key === "renderString") {
      element.innerHTML =
        value == null
          ? ""
          : String(value);

      return;
    }


    /*
     * ------------------------------------------------------------
     * Style
     * ------------------------------------------------------------
     */

    if (
      key === "style" &&
      typeof value === "string"
    ) {
      element.style.cssText = value;
      return;
    }


    /*
     * ------------------------------------------------------------
     * class / className
     * ------------------------------------------------------------
     */

    if (
      key === "class" ||
      key === "className"
    ) {
      element.setAttribute(
        "class",
        value == null
          ? ""
          : String(value),
      );

      return;
    }


    /*
     * ------------------------------------------------------------
     * ARIA / data attributes
     * ------------------------------------------------------------
     *
     * These are attributes rather than normal DOM properties.
     */

    if (
      key.startsWith("aria-") ||
      key.startsWith("data-")
    ) {
      element.setAttribute(
        key,
        value == null
          ? ""
          : String(value),
      );

      return;
    }


    /*
     * ------------------------------------------------------------
     * Null / undefined
     * ------------------------------------------------------------
     *
     * A nullish property should behave like a removed property.
     */

    if (
      value === null ||
      value === undefined
    ) {
      try {
        Reflect.set(
          element,
          key,
          value,
        );
      } catch {
        // Ignore read-only DOM properties.
      }

      return;
    }


    /*
     * ------------------------------------------------------------
     * DOM property
     * ------------------------------------------------------------
     *
     * Use the native DOM property whenever one exists.
     *
     * This is important for:
     *
     *   disabled
     *   checked
     *   selected
     *   value
     *   readOnly
     *   required
     *   multiple
     *   hidden
     *   tabIndex
     *   etc.
     */

    try {

      Reflect.set(
        element,
        key,
        value,
      );

    } catch {

      /*
       * Some DOM objects expose read-only properties.
       *
       * Fall back to an attribute when possible.
       */

      if (
        typeof value === "boolean"
      ) {

        if (value) {
          element.setAttribute(
            key,
            "",
          );
        } else {
          element.removeAttribute(
            key,
          );
        }

        return;
      }

      element.setAttribute(
        key,
        String(value),
      );
    }
  }
}