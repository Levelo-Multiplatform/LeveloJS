import type { OperationBatch } from "../tree/operations/index.js";
import { translateOperationBatch } from "./NativeOperationBatch.js";
import type { NativeRendererBridge } from "./NativeRendererBridge.js";

/**
 * Translates and executes a renderer operation batch.
 *
 * Translation happens before execution so the platform bridge only receives
 * platform-neutral native operations.
 */
export function executeNativeBatch(
  bridge: NativeRendererBridge,
  batch: OperationBatch,
): void {
  const operations = translateOperationBatch(batch);

  if (operations.length === 0) {
    return;
  }

  bridge.execute(operations);
}