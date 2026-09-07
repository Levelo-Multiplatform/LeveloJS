import {
  OperationType,
  RenderOperationOf,
} from "../../../tree/operations/index.js";

import {
  NativeNodeRegistry,
} from "../NativeNodeRegistry.js";

import {
  WebOperationExecutor,
} from "../WebOperationExecutor.js";


export class RemovePropertyExecutor
  implements WebOperationExecutor<
    RenderOperationOf<OperationType.RemoveProperty>
  > {

  constructor(
    private readonly registry:
      NativeNodeRegistry,
  ) {}

  execute(
    operation:
      RenderOperationOf<
        OperationType.RemoveProperty
      >,
  ): void {

    const node =
      this.registry.resolve<Element>(
        operation.target,
      );

    const key =
      operation.payload.key;


    /*
     * ------------------------------------------------------------
     * Internal Levelo property
     * ------------------------------------------------------------
     */

    if (key === "renderString") {
      node.innerHTML = "";
      return;
    }


    /*
     * ------------------------------------------------------------
     * Style
     * ------------------------------------------------------------
     */

    if (key === "style") {

      if (
        node instanceof HTMLElement ||
        node instanceof SVGElement
      ) {
        node.style.cssText = "";
      }

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
      node.removeAttribute("class");

      return;
    }


    /*
     * ------------------------------------------------------------
     * ARIA / data attributes
     * ------------------------------------------------------------
     */

    if (
      key.startsWith("aria-") ||
      key.startsWith("data-")
    ) {
      node.removeAttribute(key);

      return;
    }


    /*
     * ------------------------------------------------------------
     * Native DOM property reset
     * ------------------------------------------------------------
     *
     * DOM properties should be reset to their native
     * default value rather than deleted.
     *
     * Examples:
     *
     *   disabled  -> false
     *   checked   -> false
     *   selected  -> false
     *   hidden    -> false
     *   required  -> false
     *
     * For other properties we attempt to restore the
     * browser's natural default by removing the
     * corresponding attribute first.
     */

    const propertyDescriptor =
      findPropertyDescriptor(
        node,
        key,
      );


    if (
      propertyDescriptor &&
      propertyDescriptor.set
    ) {

      const defaultValue =
        getDefaultPropertyValue(
          node,
          key,
        );

      try {

        propertyDescriptor.set.call(
          node,
          defaultValue,
        );

      } catch {
        /*
         * Ignore read-only or otherwise
         * restricted DOM properties.
         */
      }
    }


    /*
     * ------------------------------------------------------------
     * Remove reflected HTML attribute
     * ------------------------------------------------------------
     */

    node.removeAttribute(key);
  }
}


/* ================================================================
 * Find a property descriptor through the prototype chain.
 * ================================================================ */

function findPropertyDescriptor(
  node: Element,
  key: string,
): PropertyDescriptor | undefined {

  let current:
    object | null =
    node;

  while (current) {

    const descriptor =
      Object.getOwnPropertyDescriptor(
        current,
        key,
      );

    if (descriptor) {
      return descriptor;
    }

    current =
      Object.getPrototypeOf(
        current,
      );
  }

  return undefined;
}


/* ================================================================
 * Determine a sensible native default for a DOM property.
 * ================================================================ */

function getDefaultPropertyValue(
  node: Element,
  key: string,
): unknown {

  /*
   * Boolean DOM properties.
   */

  const booleanProperties =
    new Set([
      "checked",
      "defaultChecked",
      "disabled",
      "hidden",
      "multiple",
      "muted",
      "open",
      "readOnly",
      "required",
      "reversed",
      "selected",
      "autofocus",
      "controls",
      "defer",
      "formNoValidate",
      "loop",
      "noModule",
      "noValidate",
      "playsInline",
      "allowFullscreen",
      "async",
      "download",
    ]);

  if (
    booleanProperties.has(key)
  ) {
    return false;
  }


  /*
   * Numeric properties.
   */

  const numericProperties =
    new Set([
      "cols",
      "rows",
      "size",
      "span",
      "tabIndex",
      "maxLength",
      "minLength",
      "low",
      "high",
      "optimum",
    ]);

  if (
    numericProperties.has(key)
  ) {
    return 0;
  }


  /*
   * String-like properties.
   */

  const stringProperties =
    new Set([
      "value",
      "defaultValue",
      "placeholder",
      "title",
      "id",
      "name",
      "src",
      "href",
      "alt",
      "type",
      "target",
      "accept",
      "action",
      "method",
      "pattern",
      "role",
    ]);

  if (
    stringProperties.has(key)
  ) {
    return "";
  }


  /*
   * For unknown properties, use undefined.
   *
   * The attribute is still removed below.
   */

  return undefined;
}