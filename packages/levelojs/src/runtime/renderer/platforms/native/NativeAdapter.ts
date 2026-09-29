import { OperationBatch } from "../../tree/operations/index.js";
import { PlatformAdapter } from "../PlatformAdapter.js";
import { executeNativeBatch } from "../../native/executeNativeBatch.js";
import type { NativeRendererBridge } from "../../native/NativeRendererBridge.js";

export class NativeAdapter implements PlatformAdapter<unknown> {
  constructor(
    private readonly bridge: NativeRendererBridge,
  ) {}

  execute(batch: OperationBatch): void {
    executeNativeBatch(this.bridge, batch);
  }

  mount(_host: unknown, _rootId: number): void {}

  unmount(_host: unknown, _rootId: number): void {}

  dispose(): void {
    this.bridge.dispose();
  }
}

