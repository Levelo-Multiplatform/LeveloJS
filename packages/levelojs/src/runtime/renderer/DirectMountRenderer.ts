import { PlatformAdapter } from "./platforms/PlatformAdapter.js";
import { OperationType, OperationBatch, RenderOperation } from "./tree/operations/index.js";
import { InternalRenderNode } from "./tree/InternalRenderNode.js";
import { RenderTree } from "./tree/RenderTree.js";

/**
 * Builds the native tree once without comparing it to another tree.
 * Reactive updates are handled separately by ReactiveRuntime.
 */
export class DirectMountRenderer {
  constructor(private readonly adapter: PlatformAdapter) {}

  mount(tree: RenderTree): void {
    const operations: RenderOperation[] = [];
    this.collect(tree.root, operations);
    this.adapter.execute(new OperationBatch(operations));
  }

  collect(node: InternalRenderNode, operations: RenderOperation[]): void {
    if (node.type === "#text") {
      operations.push({
        type: OperationType.CreateText,
        target: node.id,
        payload: { text: String(node.props.get("text") ?? "") },
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
      if (key === "__namespace") continue;
      operations.push({
        type: OperationType.SetProperty,
        target: node.id,
        payload: { key, value },
      });
    }

    for (const [property, value] of node.styles) {
      operations.push({
        type: OperationType.SetStyle,
        target: node.id,
        payload: { property, value },
      });
    }

    for (const [event, handler] of node.events) {
      operations.push({
        type: OperationType.AddEventListener,
        target: node.id,
        payload: { event, handler },
      });
    }

    for (const child of node.children) {
      this.collect(child, operations);
      operations.push({
        type: OperationType.AppendChild,
        target: node.id,
        payload: { childId: child.id },
      });
    }
  }
}
