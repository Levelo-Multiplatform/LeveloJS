import type { NativeOperation } from "./NativeOperationBridge.js";
import type { NativeRendererBridge } from "./NativeRendererBridge.js";
import type { DomPatch } from "../platforms/web/DomPatch.js";

/**
 * Shape of the wasm-bindgen generated module.
 *
 * We only declare the pieces the bridge actually uses. The generated module
 * may also expose a `default` (namespace object) and a `version` helper, but
 * neither is required here.
 */
interface WasmModule {
  WasmRenderer: new () => WasmRendererHandle;
}

interface WasmRendererHandle {
  execute_batch(operations: unknown[]): DomPatch[];
  node_count(): number;
  free(): void;
}

/**
 * Loads the WASM module.
 *
 * IMPORTANT: The specifier is a literal string inside `import(...)` so
 * bundlers (Vite, Rollup, webpack, tsup) can statically see it and rewrite
 * it to a real URL. Do not route it through a variable or `new Function` —
 * that hides it from the bundler and causes the browser to receive a bare
 * specifier it cannot resolve at runtime.
 *
 * `tsup` marks "levelojs/wasm" as external (see tsup.config.ts) so this
 * package's own build does not try to inline it. Consumers resolve it via
 * the "exports" map in package.json.
 */
async function loadWasmModule(): Promise<WasmModule> {
  const mod = await import("levelojs/wasm");
  return mod as unknown as WasmModule;
}

export class LeveloWasmBridge implements NativeRendererBridge {
  private renderer: WasmRendererHandle | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    let module: WasmModule;

    try {
      module = await loadWasmModule();
    } catch (error) {
      throw new Error(
        "[Levelo] The native renderer requires the `levelo-wasm` module. " +
          "Build it with `wasm-pack build native/levelo-bindings/wasm --target bundler` " +
          `before using createWasmRenderer(). Original error: ${String(error)}`,
      );
    }

    if (typeof module.WasmRenderer !== "function") {
      throw new Error(
        "[Levelo] The `levelo-wasm` module did not expose a WasmRenderer class.",
      );
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