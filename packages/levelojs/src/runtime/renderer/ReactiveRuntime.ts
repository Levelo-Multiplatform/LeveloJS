import { effect } from "../reactivity/reactivity.js";
import { PlatformAdapter } from "./platforms/PlatformAdapter.js";
import {
  InternalRenderNode,
  DynamicChildBinding,
} from "./tree/InternalRenderNode.js";
import {
  OperationType,
  OperationBatch,
  RenderOperation,
} from "./tree/operations/index.js";

/**
 * Connects individual reactive expressions to individual native updates.
 * No tree comparison or reconciliation is performed here.
 */
export class ReactiveRuntime {
  private readonly disposers = new WeakMap<
    InternalRenderNode,
    (() => void)[]
  >();

  constructor(private readonly adapter: PlatformAdapter) {}

  activate(root: InternalRenderNode): void {
    this.activateNode(root);
  }

  dispose(root: InternalRenderNode): void {
    this.disposeNode(root);
  }

  private activateNode(node: InternalRenderNode): void {
    const nodeDisposers: (() => void)[] = [];
    this.disposers.set(node, nodeDisposers);

    if (node.type === "#text" && node.reactiveText) {
      const getter = node.reactiveText;

      nodeDisposers.push(
        effect(() => {
          this.adapter.execute(
            new OperationBatch([
              {
                type: OperationType.SetText,
                target: node.id,
                payload: {
                  text: String(getter() ?? ""),
                },
              },
            ]),
          );
        }),
      );
    }

    for (const [key, getter] of node.reactiveProps) {
      if (key === "__reactiveStyleObject") {
        nodeDisposers.push(
          effect(() => {
            const value = getter();

            this.adapter.execute(
              new OperationBatch([
                {
                  type: OperationType.SetProperty,
                  target: node.id,
                  payload: {
                    key: "style",
                    value: styleObjectToCss(value),
                  },
                },
              ]),
            );
          }),
        );

        continue;
      }

      nodeDisposers.push(
        effect(() => {
          const value = getter();

          this.adapter.execute(
            new OperationBatch([
              {
                type:
                  value == null || value === false
                    ? OperationType.RemoveProperty
                    : OperationType.SetProperty,
                target: node.id,
                payload:
                  value == null || value === false
                    ? { key }
                    : { key, value },
              } as RenderOperation,
            ]),
          );
        }),
      );
    }

    for (const [property, getter] of node.reactiveStyles) {
      nodeDisposers.push(
        effect(() => {
          const value = getter();

          this.adapter.execute(
            new OperationBatch([
              {
                type:
                  value == null || value === false
                    ? OperationType.RemoveStyle
                    : OperationType.SetStyle,
                target: node.id,
                payload:
                  value == null || value === false
                    ? { property }
                    : {
                        property,
                        value: String(value),
                      },
              } as RenderOperation,
            ]),
          );
        }),
      );
    }

    for (const [event, getter] of node.reactiveEvents) {
      let previous: EventListener | null = null;

      nodeDisposers.push(
        effect(() => {
          const next = getter();
          const operations: RenderOperation[] = [];

          if (previous) {
            operations.push({
              type: OperationType.RemoveEventListener,
              target: node.id,
              payload: {
                event,
                handler: previous,
              },
            });
          }

          if (typeof next === "function") {
            previous = next as EventListener;

            operations.push({
              type: OperationType.AddEventListener,
              target: node.id,
              payload: {
                event,
                handler: previous,
              },
            });
          } else {
            previous = null;
          }

          if (operations.length) {
            this.adapter.execute(
              new OperationBatch(operations),
            );
          }
        }),
      );
    }

    for (const child of node.children) {
      this.activateNode(child);
    }

    for (const binding of node.dynamicChildren) {
      nodeDisposers.push(
        this.activateDynamicChild(node, binding),
      );
    }
  }

  private activateDynamicChild(
    parent: InternalRenderNode,
    binding: DynamicChildBinding,
  ): () => void {
    return effect(() => {
      const value = binding.getter();

      // The initial value is already mounted. Do not replace it merely because
      // the binding is being connected for the first time.
      if (Object.is(binding.lastValue, value)) {
        return;
      }

      const next = this.materialize(value);

      if (this.sameNodes(binding.current, next)) {
        binding.lastValue = value;
        return;
      }

      this.replaceDynamicChildren(
        parent,
        binding,
        binding.current,
        next,
      );

      binding.current = next;
      binding.lastValue = value;

      for (const node of next) {
        this.activateNode(node);
      }
    });
  }

  private replaceDynamicChildren(
    parent: InternalRenderNode,
    binding: DynamicChildBinding,
    previous: InternalRenderNode[],
    next: InternalRenderNode[],
  ): void {
    const previousIndex = previous.length
      ? parent.children.indexOf(previous[0])
      : this.findDynamicInsertionIndex(parent, binding);

    const index =
      previousIndex < 0
        ? parent.children.length
        : previousIndex;

    const reference = previous.length
      ? previous[0]
      : parent.children[index] ?? null;

    const operations: RenderOperation[] = [];

    for (const node of next) {
      this.collectMount(node, operations);
    }

    if (reference) {
      for (const node of next) {
        operations.push({
          type: OperationType.InsertBefore,
          target: parent.id,
          payload: {
            childId: node.id,
            beforeChildId: reference.id,
          },
        });
      }
    } else {
      for (const node of next) {
        operations.push({
          type: OperationType.AppendChild,
          target: parent.id,
          payload: {
            childId: node.id,
          },
        });
      }
    }

    for (const node of previous) {
      operations.push({
        type: OperationType.RemoveChild,
        target: parent.id,
        payload: {
          childId: node.id,
        },
      });

      this.disposeNode(node);
      this.collectDelete(node, operations);
    }

    if (operations.length) {
      this.adapter.execute(
        new OperationBatch(operations),
      );
    }

    parent.children.splice(
      index,
      previous.length,
      ...next,
    );

    for (const node of previous) {
      node.parent = null;
    }

    for (const node of next) {
      node.parent = parent;
    }
  }

  private findDynamicInsertionIndex(
    parent: InternalRenderNode,
    binding: DynamicChildBinding,
  ): number {
    let index = binding.position;
  
    for (const previous of parent.dynamicChildren) {
      if (previous === binding) break;
  
      index += previous.current.length - previous.initialLength;
    }
  
    return Math.max(
      0,
      Math.min(index, parent.children.length),
    );
  }

  private materialize(
    value: unknown,
  ): InternalRenderNode[] {
    if (
      value == null ||
      value === false ||
      value === true
    ) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        this.materialize(item),
      );
    }

    if (value instanceof InternalRenderNode) {
      return [value];
    }

    const node = new InternalRenderNode(
      nextDynamicId(),
      "#text",
    );

    node.props.set(
      "text",
      String(value),
    );

    return [node];
  }

  private collectMount(
    node: InternalRenderNode,
    operations: RenderOperation[],
  ): void {
    if (node.type === "#text") {
      operations.push({
        type: OperationType.CreateText,
        target: node.id,
        payload: {
          text: String(
            node.props.get("text") ?? "",
          ),
        },
      });

      return;
    }

    operations.push({
      type: OperationType.CreateElement,
      target: node.id,
      payload: {
        type: node.type,
        props: Object.fromEntries(node.props),
      },
    });

    for (const [key, value] of node.props) {
      if (key === "__namespace") {
        continue;
      }

      operations.push({
        type: OperationType.SetProperty,
        target: node.id,
        payload: {
          key,
          value,
        },
      });
    }

    for (const [property, value] of node.styles) {
      operations.push({
        type: OperationType.SetStyle,
        target: node.id,
        payload: {
          property,
          value,
        },
      });
    }

    for (const [event, handler] of node.events) {
      operations.push({
        type: OperationType.AddEventListener,
        target: node.id,
        payload: {
          event,
          handler,
        },
      });
    }

    for (const child of node.children) {
      this.collectMount(child, operations);

      operations.push({
        type: OperationType.AppendChild,
        target: node.id,
        payload: {
          childId: child.id,
        },
      });
    }
  }

  private collectDelete(
    node: InternalRenderNode,
    operations: RenderOperation[],
  ): void {
    for (const child of node.children) {
      this.collectDelete(child, operations);
    }

    operations.push({
      type: OperationType.DeleteNode,
      target: node.id,
      payload: {},
    });
  }

  private sameNodes(
    a: InternalRenderNode[],
    b: InternalRenderNode[],
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every(
      (node, index) => node === b[index],
    );
  }

  private disposeNode(
    node: InternalRenderNode,
  ): void {
    for (const child of node.children) {
      this.disposeNode(child);
    }

    for (
      const disposer of
      this.disposers.get(node) ?? []
    ) {
      disposer();
    }

    this.disposers.delete(node);
  }
}

let dynamicId = 2_000_000;

function nextDynamicId(): number {
  return dynamicId++;
}

function styleObjectToCss(
  value: unknown,
): string {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return "";
  }

  const parts: string[] = [];

  for (
    const [property, rawValue] of
    Object.entries(
      value as Record<string, unknown>,
    )
  ) {
    if (
      rawValue === null ||
      rawValue === undefined ||
      rawValue === false
    ) {
      continue;
    }

    const cssProperty =
      property.startsWith("--")
        ? property
        : property.replace(
            /[A-Z]/g,
            (match) =>
              `-${match.toLowerCase()}`,
          );

    parts.push(
      `${cssProperty}: ${String(rawValue)};`,
    );
  }

  return parts.join(" ");
}
