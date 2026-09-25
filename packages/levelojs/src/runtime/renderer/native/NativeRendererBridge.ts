import type { NativeOperation } from "./NativeOperationBridge.js";
import type { DomPatch } from "../platforms/web/DomPatch.js";

/**
 * Platform boundary for executing native renderer operations.
 *
 * The renderer produces platform-neutral operations. Concrete bridges
 * decide how those operations reach Rust, Android, or another platform,
 * and return the patches a platform adapter should apply.
 */
export interface NativeRendererBridge {
  /**
   * Executes an ordered batch of native operations and returns the patches
   * the platform adapter should apply, in order.
   */
  execute(operations: readonly NativeOperation[]): DomPatch[];

  /**
   * Releases native resources owned by the bridge.
   */
  dispose(): void;
}