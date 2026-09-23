import type { NativeOperation } from "./NativeOperationBridge.js";

/**
 * Platform boundary for executing native renderer operations.
 *
 * The renderer produces platform-neutral operations. Concrete bridges
 * decide how those operations reach Rust, Android, or another platform.
 */
export interface NativeRendererBridge {
  /**
   * Executes an ordered batch of native operations.
   */
  execute(operations: readonly NativeOperation[]): void;

  /**
   * Releases native resources owned by the bridge.
   */
  dispose(): void;
}