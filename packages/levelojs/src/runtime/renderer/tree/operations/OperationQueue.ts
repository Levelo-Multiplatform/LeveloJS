import { RenderOperation } from "./RenderOperation.js";
import { OperationBatch } from "./OperationBatch.js";

export class OperationQueue {
  private readonly operations: RenderOperation[] = [];

  enqueue(operation: RenderOperation): void {
    this.operations.push(operation);
  }

  enqueueMany(operations: readonly RenderOperation[]): void {
    this.operations.push(...operations);
  }

  dequeue(): RenderOperation | undefined {
    return this.operations.shift();
  }

  flush(): OperationBatch {
    const batch = new OperationBatch(this.operations);
    this.operations.length = 0;
    return batch;
  }

  clear(): void {
    this.operations.length = 0;
  }

  isEmpty(): boolean {
    return this.operations.length === 0;
  }

  size(): number {
    return this.operations.length;
  }

  peek(): RenderOperation | undefined {
    return this.operations[0];
  }
}