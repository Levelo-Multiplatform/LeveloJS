import { RenderOperation } from "./RenderOperation.js";

export class OperationBatch {

  public readonly operations: readonly RenderOperation[];

  constructor(
    operations: readonly RenderOperation[],
  ) {
    this.operations =
      Object.freeze([...operations]);
  }

  get size(): number {
    return this.operations.length;
  }

  isEmpty(): boolean {
    return this.operations.length === 0;
  }

  get(
    index: number,
  ): RenderOperation | undefined {
    return this.operations[index];
  }

  [Symbol.iterator](): Iterator<RenderOperation> {
    return this.operations[Symbol.iterator]();
  }
}