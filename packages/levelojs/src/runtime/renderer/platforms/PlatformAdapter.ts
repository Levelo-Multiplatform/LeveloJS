import { OperationBatch } from "../tree/operations/index.js";

/** Platform boundary for renderer execution and host mounting. */
export interface PlatformAdapter<THost = unknown> {
  execute(batch: OperationBatch): void;
  mount(host: THost, rootId: number): void;
  unmount(host: THost, root: unknown): void;
}
