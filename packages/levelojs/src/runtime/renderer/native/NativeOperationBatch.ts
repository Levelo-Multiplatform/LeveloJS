import {
  OperationBatch,
  RenderOperation,
} from "../tree/operations/index.js";

import {
  NativeOperation,
  translateOperation,
} from "./NativeOperationBridge.js";

/**
 * Translates TypeScript operations into native-core operations.
 *
 * Operations remain in their original order. JavaScript-only event
 * operations are not forwarded across the native boundary.
 */
export function translateOperationBatch(
  batch: OperationBatch,
): NativeOperation[] {
  const nativeOperations: NativeOperation[] = [];

  for (const operation of batch) {
    const translated = translateOperation(
      operation as RenderOperation,
    );

    if (translated !== null) {
      nativeOperations.push(translated);
    }
  }

  return nativeOperations;
}