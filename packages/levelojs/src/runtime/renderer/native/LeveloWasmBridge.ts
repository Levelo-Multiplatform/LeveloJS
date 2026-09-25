import type { NativeOperation } from "./NativeOperationBridge.js";
import type { NativeRendererBridge } from "./NativeRendererBridge.js";
import type { DomPatch } from "../platforms/web/DomPatch.js";

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
  execute_batch(operations: unknown[]): DomPatch[];
  node_count(): number;
  free(): void;
}

/**
 * Loads the WASM module.
 *
 * The import specifier is preserved as an opaque string so bundlers do not
 * statically resolve it. Resolution is done at runtime relative to this
 * file's location.
 *
 * In a bundler context, the bundler resolves the specifier during its own
 * resolution pass (the `@vite-ignore` comment prevents it from being
 * inlined). In a Node context (Vitest), `new Function("import")` bypasses
 * Vite's static analysis so the specifier reaches Node's ESM loader as-is.
 */
const WASM_MODULE_ID =
  "../../../../../../native/levelo-bindings/wasm/pkg/levelo_wasm.js";

/**
 * Opaque dynamic import.
 *
 * `new Function` prevents esbuild, Rollup, Vite, and Webpack from
 * statically analyzing the import target.
 */
function runtimeImport<T>(specifier: string): Promise<T> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<T>;

  return dynamicImport(specifier);
}

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
      module = await runtimeImport<WasmModule>(WASM_MODULE_ID);
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

  execute(operations: readonly NativeOperation[]): DomPatch[] {
    if (!this.renderer) {
      throw new Error(
        "LeveloWasmBridge must be initialized before execution.",
      );
    }

    return this.renderer.execute_batch([...operations]);
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