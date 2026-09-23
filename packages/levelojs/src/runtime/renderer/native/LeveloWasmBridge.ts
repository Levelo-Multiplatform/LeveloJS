import type { NativeOperation } from "./NativeOperationBridge.js";
import type { NativeRendererBridge } from "./NativeRendererBridge.js";

/**
 * Shape of the wasm-bindgen generated module.
 *
 * We declare this locally instead of importing the generated `.d.ts` so the
 * bridge does not statically depend on the WASM package's file layout.
 */
interface WasmModule {
  default: (
    input?:
      | { module_or_path?: unknown }
      | unknown,
  ) => Promise<unknown>;

  WasmRenderer: new () => WasmRendererHandle;
}

/**
 * Handle to the WASM-side renderer instance.
 */
interface WasmRendererHandle {
  execute_batch(operations: unknown[]): void;
  node_count(): number;
  free(): void;
}

/**
 * Loads the optional WASM module.
 *
 * The module is resolved through a dynamic import so:
 *
 *   - bundlers do not statically inline the WASM package;
 *   - the CJS build does not trip over `import.meta.url` inside
 *     the wasm-bindgen glue code;
 *   - consumers who never use the native renderer never pay for
 *     the WASM package.
 *
 * The path is intentionally a build-time constant. Replace it with
 * `@levelo/wasm` once that package is published.
 */
const WASM_MODULE_ID =
  "../../../../../../native/levelo-bindings/wasm/pkg/levelo_wasm.js";

type WasmInitInput = unknown;

export class LeveloWasmBridge implements NativeRendererBridge {
  private renderer: WasmRendererHandle | null = null;
  private initialized = false;

  async initialize(input?: WasmInitInput): Promise<void> {
    if (this.initialized) {
      return;
    }

    let module: WasmModule;

    try {
      module = (await import(
        /* @vite-ignore */
        /* webpackIgnore: true */
        WASM_MODULE_ID
      )) as WasmModule;
    } catch (error) {
      throw new Error(
        "[Levelo] The native renderer requires the `levelo-wasm` module. " +
          "Build it with `wasm-pack build native/levelo-bindings/wasm --target bundler` " +
          `before using createWasmRenderer(). Original error: ${String(error)}`,
      );
    }

    if (typeof module.default !== "function") {
      throw new Error(
        "[Levelo] The `levelo-wasm` module did not expose an init function.",
      );
    }

    if (input === undefined) {
      await module.default();
    } else {
      await module.default({ module_or_path: input });
    }

    this.renderer = new module.WasmRenderer();
    this.initialized = true;
  }

  execute(operations: readonly NativeOperation[]): void {
    if (!this.renderer) {
      throw new Error(
        "LeveloWasmBridge must be initialized before execution.",
      );
    }

    this.renderer.execute_batch([...operations]);
  }

  dispose(): void {
    this.renderer?.free();
    this.renderer = null;
    this.initialized = false;
  }

  nodeCount(): number {
    if (!this.renderer) {
      throw new Error(
        "LeveloWasmBridge must be initialized before reading node count.",
      );
    }

    return this.renderer.node_count();
  }
}