import {
  OperationBatch,
  OperationType,
  RenderOperation,
} from "../../tree/operations/index.js";
import { PlatformAdapter } from "../PlatformAdapter.js";
import { NativeNodeRegistry } from "./NativeNodeRegistry.js";
import type { DomPatch } from "./DomPatch.js";
import type { NativeRendererBridge } from "../../native/NativeRendererBridge.js";
import { translateOperationBatch } from "../../native/NativeOperationBatch.js";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

export class WebAdapter implements PlatformAdapter<HTMLElement> {
  constructor(
    private readonly bridge: NativeRendererBridge,
    private readonly nodes: NativeNodeRegistry,
  ) {}

  execute(batch: OperationBatch): void {
    // First pass: collect any namespaces declared on CreateElement
    // operations. Namespaces are a DOM concern, so the core never sees
    // them; the adapter keeps them in scope for the duration of this batch.
    const namespaces = collectNamespaces(batch);

    // Translate the operation batch to platform-neutral native operations.
    // The bridge sends these to Rust and returns the patches the core
    // computed.
    const nativeOperations = translateOperationBatch(batch);
    const patches = this.bridge.execute(nativeOperations);

    for (const patch of patches) {
      this.applyPatch(patch, namespaces);
    }
  }

  mount(host: HTMLElement, rootId: number): void {
    const root = this.nodes.resolve<Node>(rootId);
    if (root.parentNode !== host) {
      host.appendChild(root);
    }
  }

  unmount(host: HTMLElement, rootId: number): void {
    const root = this.nodes.resolve<Node>(rootId);
    if (root.parentNode === host) {
      host.removeChild(root);
    }
    this.nodes.remove(rootId);
  }

  private applyPatch(
    patch: DomPatch,
    namespaces: Map<number, string>,
  ): void {
    switch (patch.type) {
      case "CreateElement": {
        this.createNode(patch, namespaces);
        return;
      }

      case "CreateText": {
        const text = document.createTextNode(patch.text);
        this.nodes.register(patch.node, text);
        return;
      }

      case "SetProperty": {
        this.setProperty(patch.node, patch.name, patch.value);
        return;
      }

      case "RemoveProperty": {
        this.removeProperty(patch.node, patch.name);
        return;
      }

      case "SetStyle": {
        this.setStyle(patch.node, patch.name, patch.value);
        return;
      }

      case "RemoveStyle": {
        this.removeStyle(patch.node, patch.name);
        return;
      }

      case "SetText": {
        const node = this.nodes.resolve<Node>(patch.node);
        node.textContent = patch.text;
        return;
      }

      case "AppendChild": {
        const parent = this.nodes.resolve<Node>(patch.parent);
        const child = this.nodes.resolve<Node>(patch.child);
        parent.appendChild(child);
        return;
      }

      case "InsertBefore": {
        const parent = this.nodes.resolve<Node>(patch.parent);
        const child = this.nodes.resolve<Node>(patch.child);
        const reference = this.nodes.resolve<Node>(patch.reference);
        parent.insertBefore(child, reference);
        return;
      }

      case "RemoveChild": {
        const parent = this.nodes.resolve<Node>(patch.parent);
        const child = this.nodes.resolve<Node>(patch.child);
        if (child.parentNode === parent) {
          parent.removeChild(child);
        }
        return;
      }

      case "ReplaceChild": {
        const parent = this.nodes.resolve<Node>(patch.parent);
        const newChild = this.nodes.resolve<Node>(patch.newChild);
        const oldChild = this.nodes.resolve<Node>(patch.oldChild);
        if (oldChild.parentNode === parent) {
          parent.replaceChild(newChild, oldChild);
        }
        return;
      }

      case "DeleteNode": {
        this.nodes.remove(patch.node);
        return;
      }
    }
  }

  private createNode(
    patch: { node: number; tag: string },
    namespaces: Map<number, string>,
  ): void {
    const namespace = namespaces.get(patch.node);

    const element =
      namespace === HTML_NAMESPACE
        ? document.createElementNS(HTML_NAMESPACE, patch.tag)
        : namespace
          ? document.createElementNS(namespace, patch.tag)
          : document.createElement(patch.tag);

    this.nodes.register(patch.node, element);
  }

  private setProperty(
    id: number,
    key: string,
    value: unknown,
  ): void {
    const element = this.nodes.resolve<HTMLElement>(id);

    // Internal Levelo property: render raw HTML.
    if (key === "renderString") {
      element.innerHTML = value == null ? "" : String(value);
      return;
    }

    // Style as a single string.
    if (key === "style" && typeof value === "string") {
      element.style.cssText = value;
      return;
    }

    // class / className normalization.
    if (key === "class" || key === "className") {
      element.setAttribute(
        "class",
        value == null ? "" : String(value),
      );
      return;
    }

    // ARIA / data attributes.
    if (key.startsWith("aria-") || key.startsWith("data-")) {
      element.setAttribute(
        key,
        value == null ? "" : String(value),
      );
      return;
    }

    // Nullish values behave like removed properties.
    if (value === null || value === undefined) {
      try {
        Reflect.set(element, key, value);
      } catch {
        // Ignore read-only DOM properties.
      }
      return;
    }

    // Prefer the native DOM property when one exists.
    try {
      Reflect.set(element, key, value);
    } catch {
      if (typeof value === "boolean") {
        if (value) {
          element.setAttribute(key, "");
        } else {
          element.removeAttribute(key);
        }
        return;
      }

      element.setAttribute(key, String(value));
    }
  }

  private removeProperty(id: number, key: string): void {
    const element = this.nodes.resolve<Element>(id);

    if (key === "renderString") {
      element.innerHTML = "";
      return;
    }

    if (key === "style") {
      if (
        element instanceof HTMLElement ||
        element instanceof SVGElement
      ) {
        element.style.cssText = "";
      }
      return;
    }

    if (key === "class" || key === "className") {
      element.removeAttribute("class");
      return;
    }

    if (key.startsWith("aria-") || key.startsWith("data-")) {
      element.removeAttribute(key);
      return;
    }

    // Reset the DOM property to its native default.
    const descriptor = findPropertyDescriptor(element, key);

    if (descriptor?.set) {
      const defaultValue = getDefaultPropertyValue(key);

      try {
        descriptor.set.call(element, defaultValue);
      } catch {
        // Ignore read-only properties.
      }
    }

    element.removeAttribute(key);
  }

  private setStyle(id: number, name: string, value: string): void {
    const element = this.nodes.resolve<HTMLElement | SVGElement>(id);

    if (!name || typeof name !== "string") {
      return;
    }

    const cssProperty = normalizeStyleProperty(name);
    const stringValue = String(value).trim();
    const important = /!important\s*$/i.test(stringValue);

    if (important) {
      const cleanValue = stringValue
        .replace(/\s*!important\s*$/i, "")
        .trim();

      element.style.setProperty(cssProperty, cleanValue, "important");
      return;
    }

    element.style.setProperty(cssProperty, stringValue);
  }

  private removeStyle(id: number, name: string): void {
    const element = this.nodes.resolve<HTMLElement | SVGElement>(id);

    if (!name || typeof name !== "string") {
      return;
    }

    element.style.removeProperty(normalizeStyleProperty(name));
  }
}

/**
 * Scans the batch for `CreateElement` operations that declare a namespace
 * via `props.__namespace`. Returns a map from node ID to namespace URL.
 *
 * Namespaces are a DOM concern and never cross into the core.
 */
function collectNamespaces(
  batch: OperationBatch,
): Map<number, string> {
  const namespaces = new Map<number, string>();

  for (const operation of batch as Iterable<RenderOperation>) {
    if (operation.type === OperationType.CreateElement) {
      const raw = operation.payload.props?.__namespace;

      if (typeof raw === "string" && raw.length > 0) {
        namespaces.set(operation.target, raw);
      }
    }
  }

  return namespaces;
}

function normalizeStyleProperty(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  return property.replace(
    /[A-Z]/g,
    (match) => `-${match.toLowerCase()}`,
  );
}

function findPropertyDescriptor(
  node: Element,
  key: string,
): PropertyDescriptor | undefined {
  let current: object | null = node;

  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);

    if (descriptor) {
      return descriptor;
    }

    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

function getDefaultPropertyValue(key: string): unknown {
  const booleanProperties = new Set([
    "checked", "defaultChecked", "disabled", "hidden",
    "multiple", "muted", "open", "readOnly", "required",
    "reversed", "selected", "autofocus", "controls", "defer",
    "formNoValidate", "loop", "noModule", "noValidate",
    "playsInline", "allowFullscreen", "async", "download",
  ]);

  if (booleanProperties.has(key)) {
    return false;
  }

  const numericProperties = new Set([
    "cols", "rows", "size", "span", "tabIndex",
    "maxLength", "minLength", "low", "high", "optimum",
  ]);

  if (numericProperties.has(key)) {
    return 0;
  }

  const stringProperties = new Set([
    "value", "defaultValue", "placeholder", "title", "id",
    "name", "src", "href", "alt", "type", "target",
    "accept", "action", "method", "pattern", "role",
  ]);

  if (stringProperties.has(key)) {
    return "";
  }

  return undefined;
}