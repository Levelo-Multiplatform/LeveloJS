import { RenderTree } from "../tree/RenderTree.js";
import { RenderTreeSnapshot } from "../snapshot/RenderTreeSnapshot.js";
import { NodeSnapshot } from "../snapshot/NodeSnapshot.js";

import {
  RenderOperation,
  OperationBatch,
} from "../tree/operations/index.js";

export class DiffContext {

  private readonly operations:
    RenderOperation[] = [];

  private readonly previousNodes:
    Map<number, NodeSnapshot> =
      new Map();

  constructor(
    readonly previous:
      RenderTreeSnapshot | null,

    readonly current:
      RenderTree,
  ) {

    if (previous) {

      this.indexNode(
        previous.root,
      );

    }

  }

  /**
   * Index a previous snapshot tree.
   */
  private indexNode(
    node: NodeSnapshot,
  ): void {

    this.previousNodes.set(
      node.id,
      node,
    );

    for (
      const child of node.children
    ) {

      this.indexNode(
        child,
      );

    }

  }

  /**
   * Find a previous node by ID.
   */
  findPrevious(
    id: number,
  ): NodeSnapshot | null {

    return (
      this.previousNodes.get(
        id,
      ) ?? null
    );

  }

  /**
   * Add one operation.
   */
  add(
    operation: RenderOperation,
  ): void {

    this.operations.push(
      operation,
    );

  }

  /**
   * Add multiple operations.
   */
  addMany(
    operations:
      readonly RenderOperation[],
  ): void {

    this.operations.push(
      ...operations,
    );

  }

  /**
   * Get collected operations.
   */
  getOperations():
    readonly RenderOperation[] {

    return this.operations;

  }

  /**
   * Build the operation batch.
   */
  build(): OperationBatch {

    return new OperationBatch(
      this.operations,
    );

  }

}