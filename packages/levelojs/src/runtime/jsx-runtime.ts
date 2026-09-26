import {
  InternalRenderNode,
} from "./renderer/tree/InternalRenderNode.js";
import { NodeFactory } from "./renderer/tree/NodeFactory.js";

export type ComponentProps = Record<string, unknown> & {
  children?: unknown;
};

export type Component = (
  props: ComponentProps,
) => InternalRenderNode | unknown;

export type TagType = string | Component;

const HTML_NS = "http://www.w3.org/1999/xhtml";
const SVG_NS = "http://www.w3.org/2000/svg";
const MATH_NS = "http://www.w3.org/1998/Math/MathML";

interface BuildContext {
  nextId: number;
}

let activeBuildContext: BuildContext | null = null;
let fallbackId = 1_000_000;

export function beginBuild(): void {
  activeBuildContext = { nextId: 1 };
}

export function endBuild(): void {
  activeBuildContext = null;
}

function allocateId(): number {
  if (activeBuildContext) return activeBuildContext.nextId++;
  return fallbackId++;
}

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key) || /^on[a-z]/.test(key);
}

function eventName(key: string): string {
  return key.slice(2).toLowerCase();
}

function normalizeStyleProperty(property: string): string {
  if (property.startsWith("--")) return property;
  return property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function appendChild(
  parent: InternalRenderNode,
  child: unknown,
  namespace: string | null,
): void {
  if (
    child === null ||
    child === undefined ||
    child === false ||
    child === true
  ) {
    return;
  }

  if (Array.isArray(child)) {
    for (const item of child) appendChild(parent, item, namespace);
    return;
  }

  if (typeof child === "function") {
    // The compiler wraps JSX expressions in getters. The initial value is
    // materialized now, while the getter is retained for fine-grained updates.
    const getter = child as () => unknown;
    const initialValue = getter();
  
    // Primitive expressions map to one real text node. The text node can then
    // subscribe directly to the signal without any structural work.
    if (isTextValue(initialValue)) {
      const textNode = new NodeFactory().createText(
        allocateId(),
        String(initialValue),
      );
      textNode.reactiveText = getter;
      parent.appendChild(textNode);
      return;
    }
  
    const position = parent.children.length;
    const nodes = materializeDynamicValue(initialValue, namespace);

    for (const node of nodes) {
      parent.appendChild(node);
    }

    parent.dynamicChildren.push({
      getter,
      initialValue,
      position,
      initialLength: nodes.length,
      current: nodes,
      lastValue: initialValue,
    });
    return;
  }

  if (child instanceof InternalRenderNode) {
    let childNamespace = namespace;

    if (
      namespace === SVG_NS &&
      parent.type === "foreignObject"
    ) {
      childNamespace = HTML_NS;
    }

    if (
      childNamespace &&
      !child.props.has("__namespace")
    ) {
      applyNamespace(child, childNamespace);
    }

    parent.appendChild(child);
    return;
  }

  const node = new NodeFactory().createText(
    allocateId(),
    String(child),
  );

  parent.appendChild(node);
}


function isTextValue(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  );
}

function materializeDynamicValue(
  value: unknown,
  namespace: string | null,
): InternalRenderNode[] {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === true
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    const nodes: InternalRenderNode[] = [];
    for (const item of value) {
      nodes.push(...materializeDynamicValue(item, namespace));
    }
    return nodes;
  }

  if (typeof value === "function") {
    return materializeDynamicValue((value as () => unknown)(), namespace);
  }

  if (value instanceof InternalRenderNode) {
    if (namespace && !value.props.has("__namespace")) {
      applyNamespace(value, namespace);
    }
    return [value];
  }

  return [
    new NodeFactory().createText(
      allocateId(),
      String(value),
    ),
  ];
}

function applyNamespace(
  node: InternalRenderNode,
  namespace: string,
): void {
  node.props.set("__namespace", namespace);

  const childNamespace =
    namespace === SVG_NS && node.type === "foreignObject"
      ? HTML_NS
      : namespace;

  for (const child of node.children) {
    if (!child.props.has("__namespace")) {
      applyNamespace(child, childNamespace);
    }
  }
}

export function h(
  tag: TagType,
  props: ComponentProps | null,
  ...children: unknown[]
): InternalRenderNode {
  const safeProps = props ?? {};

  if (typeof tag === "function") {
    // Preserve getter descriptors so component props remain lazy and can be
    // consumed by fine-grained bindings instead of being eagerly flattened.
    const componentProps: ComponentProps = {};

    for (const key of Reflect.ownKeys(safeProps)) {
      const descriptor = Object.getOwnPropertyDescriptor(safeProps, key);
      if (descriptor) {
        Object.defineProperty(componentProps, key, descriptor);
      }
    }

    Object.defineProperty(componentProps, "children", {
      configurable: true,
      enumerable: true,
      value: children.length === 1 ? children[0] : children,
      writable: false,
    });

    return tag(componentProps) as InternalRenderNode;
  }

  const node = new NodeFactory().createElement(
    allocateId(),
    tag,
  );

  const namespace =
    typeof safeProps.__namespace === "string"
      ? safeProps.__namespace
      : tag === "svg"
        ? SVG_NS
        : tag === "math"
          ? MATH_NS
          : null;

  if (namespace) node.props.set("__namespace", namespace);

  for (const rawKey of Object.keys(safeProps)) {
    if (
      rawKey === "children" ||
      rawKey === "__namespace" ||
      rawKey === "key"
    ) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      safeProps,
      rawKey,
    );

    const isReactive = typeof descriptor?.get === "function";
    const value = isReactive
      ? descriptor!.get!.call(safeProps)
      : safeProps[rawKey];

    if (rawKey === "className") {
      if (isReactive) {
        node.reactiveProps.set("class", () => descriptor!.get!.call(safeProps));
      }
      node.props.set("class", value);
      continue;
    }

    if (rawKey === "renderString") {
      const getter = isReactive
        ? () => descriptor!.get!.call(safeProps)
        : null;
      if (getter) node.reactiveProps.set("renderString", getter);
      node.props.set("renderString", String(value));
      continue;
    }

    if (rawKey === "style") {
      if (typeof value === "string") {
        if (isReactive) {
          node.reactiveProps.set("style", () => descriptor!.get!.call(safeProps));
        }
        node.props.set("style", value);
      } else if (value && typeof value === "object") {
        const styles = value as Record<string, unknown>;
        for (const [property, styleValue] of Object.entries(styles)) {
          const normalized = normalizeStyleProperty(property);
          if (
            styleValue !== null &&
            styleValue !== undefined &&
            styleValue !== false
          ) {
            node.styles.set(normalized, String(styleValue));
          }
        }

        if (isReactive) {
          node.reactiveProps.set("__reactiveStyleObject", () => descriptor!.get!.call(safeProps));
        }
      }
      continue;
    }

    if (isEventProp(rawKey)) {
      console.log(
        "[Levelo] JSX event:",
        rawKey,
        "value:",
        value,
        "isReactive:",
        isReactive,
        "isFunction:",
        typeof value === "function",
      );
    
      const event = eventName(rawKey);
    
      if (isReactive) {
        node.reactiveEvents.set(
          event,
          () => descriptor!.get!.call(safeProps),
        );
      } else if (typeof value === "function") {
        node.events.set(event, value as EventListener);
      }
    
      continue;
    }

    if (isReactive) {
      node.reactiveProps.set(rawKey, () => descriptor!.get!.call(safeProps));
    }

    if (
      value !== null &&
      value !== undefined &&
      value !== false
    ) {
      node.props.set(rawKey, value);
    }
  }

  for (const child of children) {
    appendChild(node, child, namespace);
  }

  return node;
}

export function jsx(
  tag: TagType,
  props: ComponentProps | null,
): InternalRenderNode {
  const safeProps = props ?? {};
  const children = safeProps.children;

  if (Object.prototype.hasOwnProperty.call(safeProps, "children")) {
    const { children: _children, ...rest } = safeProps;
    return h(
      tag,
      rest,
      ...(Array.isArray(children) ? children : [children]),
    );
  }

  return h(tag, safeProps);
}

export function jsxs(
  tag: TagType,
  props: ComponentProps | null,
): InternalRenderNode {
  return jsx(tag, props);
}

export const Fragment = ({ children }: ComponentProps): InternalRenderNode => {
  const fragment = new NodeFactory().createElement(
    allocateId(),
    "div",
  );
  appendChild(fragment, children, null);
  return fragment;
};
