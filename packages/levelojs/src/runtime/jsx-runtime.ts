import {
  InternalRenderNode,
} from "./renderer/tree/InternalRenderNode.js";

import {
  NodeFactory,
} from "./renderer/tree/NodeFactory.js";


export type ComponentProps =
  Record<string, unknown> & {
    children?: unknown;
  };


export type Component =
  (
    props: ComponentProps,
  ) => InternalRenderNode | any;


export type TagType =
  string | Component;



/*
 * ============================================================
 * WEB NAMESPACES
 * ============================================================
 */

const HTML_NS =
  "http://www.w3.org/1999/xhtml";

const SVG_NS =
  "http://www.w3.org/2000/svg";

const MATH_NS =
  "http://www.w3.org/1998/Math/MathML";



/*
 * ============================================================
 * BUILD CONTEXT
 * ============================================================
 */

interface BuildContext {
  nextId: number;
}


let activeBuildContext:
  BuildContext | null = null;


let fallbackId = 1;



/*
 * ============================================================
 * BUILD LIFECYCLE
 * ============================================================
 */

export function beginBuild(): void {

  activeBuildContext = {
    nextId: 1,
  };

}


export function endBuild(): void {

  activeBuildContext = null;

}



/*
 * ============================================================
 * ID ALLOCATION
 * ============================================================
 */

function allocateId(): number {

  if (activeBuildContext) {

    return activeBuildContext.nextId++;

  }

  return fallbackId++;

}



/*
 * ============================================================
 * EVENT HELPERS
 * ============================================================
 */

function isEventProp(
  key: string,
): boolean {

  return (
    /^on[A-Z]/.test(key) ||
    /^on[a-z]/.test(key)
  );

}


function eventName(
  key: string,
): string {

  return key
    .slice(2)
    .toLowerCase();

}



/*
 * ============================================================
 * STYLE HELPERS
 * ============================================================
 */

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
    match =>
      `-${match.toLowerCase()}`,
  );

}



/*
 * ============================================================
 * CHILD APPENDING
 * ============================================================
 */

function appendChild(
  parent: InternalRenderNode,
  child: unknown,
  namespace: string | null,
): void {

  /*
   * ----------------------------------------------------------
   * Ignore empty children
   * ----------------------------------------------------------
   */

  if (
    child === null ||
    child === undefined ||
    child === false ||
    child === true
  ) {

    return;

  }



  /*
   * ----------------------------------------------------------
   * Arrays / fragments
   * ----------------------------------------------------------
   */

  if (Array.isArray(child)) {

    for (
      const item of child
    ) {

      appendChild(
        parent,
        item,
        namespace,
      );

    }

    return;

  }



  /*
   * ----------------------------------------------------------
   * Internal render nodes
   * ----------------------------------------------------------
   */

  if (
    child instanceof InternalRenderNode
  ) {

    let childNamespace =
      namespace;



    /*
     * --------------------------------------------------------
     * SVG foreignObject boundary
     * --------------------------------------------------------
     *
     * foreignObject itself is an SVG element.
     *
     * Its embedded HTML content belongs to
     * the XHTML namespace.
     *
     * SVG
     *   └── foreignObject   → SVG
     *         └── div       → HTML
     *               └── span → HTML
     *
     * --------------------------------------------------------
     */

    if (
      namespace === SVG_NS &&
      parent.type === "foreignObject"
    ) {

      childNamespace =
        HTML_NS;

    }



    /*
     * --------------------------------------------------------
     * Apply inherited namespace
     * --------------------------------------------------------
     */

    if (
      childNamespace &&
      !child.props.has(
        "__namespace",
      )
    ) {

      applyNamespace(
        child,
        childNamespace,
      );

    }



    /*
     * --------------------------------------------------------
     * Attach to internal tree
     * --------------------------------------------------------
     */

    parent.appendChild(
      child,
    );

    return;

  }



  /*
   * ----------------------------------------------------------
   * Function children
   * ----------------------------------------------------------
   */

  if (
    typeof child === "function"
  ) {

    appendChild(
      parent,
      child(),
      namespace,
    );

    return;

  }



  /*
   * ----------------------------------------------------------
   * Primitive children → text nodes
   * ----------------------------------------------------------
   */

  const factory =
    new NodeFactory();


  const text =
    factory.createText(
      allocateId(),
      String(child),
    );


  parent.appendChild(
    text,
  );

}



/*
 * ============================================================
 * NAMESPACE PROPAGATION
 * ============================================================
 */

function applyNamespace(
  node: InternalRenderNode,
  namespace: string,
): void {

  /*
   * ----------------------------------------------------------
   * Set namespace on current node
   * ----------------------------------------------------------
   */

  node.props.set(
    "__namespace",
    namespace,
  );



  /*
   * ----------------------------------------------------------
   * Determine namespace for children
   * ----------------------------------------------------------
   *
   * foreignObject creates a namespace boundary:
   *
   * foreignObject itself → SVG
   * its normal children   → HTML/XHTML
   *
   * ----------------------------------------------------------
   */

  const childNamespace =
    namespace === SVG_NS &&
    node.type === "foreignObject"
      ? HTML_NS
      : namespace;



  /*
   * ----------------------------------------------------------
   * Propagate to descendants
   * ----------------------------------------------------------
   */

  for (
    const child of node.children
  ) {

    if (
      !child.props.has(
        "__namespace",
      )
    ) {

      applyNamespace(
        child,
        childNamespace,
      );

    }

  }

}



/*
 * ============================================================
 * ELEMENT CREATION
 * ============================================================
 */

export function h(
  tag: TagType,
  props: ComponentProps | null,
  ...children: unknown[]
): InternalRenderNode {

  const safeProps =
    props ?? {};



  /*
   * ----------------------------------------------------------
   * Components
   * ----------------------------------------------------------
   */

  if (
    typeof tag === "function"
  ) {

    return tag({

      ...safeProps,

      children:
        children.length === 1
          ? children[0]
          : children,

    });

  }



  /*
   * ----------------------------------------------------------
   * Create internal element
   * ----------------------------------------------------------
   */

  const factory =
    new NodeFactory();


  const node =
    factory.createElement(
      allocateId(),
      tag,
    );



  /*
   * ----------------------------------------------------------
   * Determine namespace
   * ----------------------------------------------------------
   *
   * Explicit namespace wins.
   *
   * Otherwise:
   *
   * svg  → SVG namespace
   * math → MathML namespace
   * other elements → normal HTML
   *
   * ----------------------------------------------------------
   */

  const namespace =
    typeof safeProps.__namespace === "string"
      ? safeProps.__namespace
      : tag === "svg"
        ? SVG_NS
        : tag === "math"
          ? MATH_NS
          : null;



  /*
   * ----------------------------------------------------------
   * Store namespace
   * ----------------------------------------------------------
   */

  if (namespace) {

    node.props.set(
      "__namespace",
      namespace,
    );

  }



  /*
   * ----------------------------------------------------------
   * Process properties
   * ----------------------------------------------------------
   */

  for (
    const [
      rawKey,
      value,
    ] of Object.entries(
      safeProps,
    )
  ) {

    /*
     * Internal / structural properties
     */

    if (
      rawKey === "children" ||
      rawKey === "__namespace" ||
      rawKey === "key"
    ) {

      continue;

    }



    /*
     * className → class
     */

    if (
      rawKey === "className"
    ) {

      node.props.set(
        "class",
        value,
      );

      continue;

    }



    /*
     * renderString
     */

    if (
      rawKey === "renderString"
    ) {

      node.props.set(
        "renderString",
        String(value),
      );

      continue;

    }



    /*
     * --------------------------------------------------------
     * Style
     * --------------------------------------------------------
     */

    if (
      rawKey === "style"
    ) {

      if (
        typeof value === "string"
      ) {

        node.props.set(
          "style",
          value,
        );

      } else if (
        value &&
        typeof value === "object"
      ) {

        for (
          const [
            property,
            styleValue,
          ] of Object.entries(
            value as Record<
              string,
              unknown
            >,
          )
        ) {

          if (
            styleValue !== null &&
            styleValue !== undefined &&
            styleValue !== false
          ) {

            node.styles.set(
              normalizeStyleProperty(
                property,
              ),
              String(styleValue),
            );

          }

        }

      }

      continue;

    }



    /*
     * --------------------------------------------------------
     * Events
     * --------------------------------------------------------
     */

    if (
      isEventProp(rawKey) &&
      typeof value === "function"
    ) {

      node.events.set(
        eventName(rawKey),
        value as EventListener,
      );

      continue;

    }



    /*
     * --------------------------------------------------------
     * Ignore empty property values
     * --------------------------------------------------------
     */

    if (
      value === null ||
      value === undefined ||
      value === false
    ) {

      continue;

    }



    /*
     * --------------------------------------------------------
     * Normal property
     * --------------------------------------------------------
     */

    node.props.set(
      rawKey,
      value,
    );

  }



  /*
   * ----------------------------------------------------------
   * Append children
   * ----------------------------------------------------------
   */

  for (
    const child of children
  ) {

    appendChild(
      node,
      child,
      namespace,
    );

  }



  return node;

}



/*
 * ============================================================
 * JSX
 * ============================================================
 */

export function jsx(
  tag: TagType,
  props: ComponentProps | null,
): InternalRenderNode {

  const safeProps =
    props ?? {};

  const children =
    safeProps.children;



  if (
    Object.prototype.hasOwnProperty.call(
      safeProps,
      "children",
    )
  ) {

    const {
      children: _children,
      ...rest
    } = safeProps;



    return h(
      tag,
      rest,
      ...(
        Array.isArray(children)
          ? children
          : [children]
      ),
    );

  }



  return h(
    tag,
    safeProps,
  );

}



/*
 * ============================================================
 * JSXS
 * ============================================================
 */

export function jsxs(
  tag: TagType,
  props: ComponentProps | null,
): InternalRenderNode {

  return jsx(
    tag,
    props,
  );

}



/*
 * ============================================================
 * FRAGMENT
 * ============================================================
 */

export const Fragment = ({
  children,
}: ComponentProps): InternalRenderNode => {

  const factory =
    new NodeFactory();


  const fragment =
    factory.createElement(
      allocateId(),
      "div",
    );


  appendChild(
    fragment,
    children,
    null,
  );


  return fragment;

};
