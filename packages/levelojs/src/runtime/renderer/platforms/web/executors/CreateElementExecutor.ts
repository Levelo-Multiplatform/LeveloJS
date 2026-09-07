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

const HTML_NAMESPACE =
  "http://www.w3.org/1999/xhtml";

const SVG_NAMESPACE =
  "http://www.w3.org/2000/svg";

const MATHML_NAMESPACE =
  "http://www.w3.org/1998/Math/MathML";

export class CreateElementExecutor
  implements WebOperationExecutor<
    RenderOperationOf<
      OperationType.CreateElement
    >
  > {

  constructor(
    private readonly registry:
      NativeNodeRegistry,
  ) {}

  execute(
    operation:
      RenderOperationOf<
        OperationType.CreateElement
      >,
  ): void {

    const rawNamespace =
      operation.payload.props?.__namespace;

    const namespace =
      typeof rawNamespace === "string" &&
      rawNamespace.length > 0
        ? rawNamespace
        : null;

    const type =
      operation.payload.type;

    const element =
      namespace === HTML_NAMESPACE
        ? document.createElementNS(
            HTML_NAMESPACE,
            type,
          )
        : namespace === SVG_NAMESPACE
          ? document.createElementNS(
              SVG_NAMESPACE,
              type,
            )
          : namespace === MATHML_NAMESPACE
            ? document.createElementNS(
                MATHML_NAMESPACE,
                type,
              )
            : namespace
              ? document.createElementNS(
                  namespace,
                  type,
                )
              : document.createElement(
                  type,
                );

    /*
     * CreateElement is responsible only for
     * creating and registering the native node.
     *
     * Properties and attributes are handled
     * separately by SetPropertyExecutor /
     * SetStyleExecutor.
     */
    this.registry.register(
      operation.target,
      element,
    );
  }
}