export interface WasmRenderer {
    execute_batch(operations: unknown[]): void;
    node_count(): number;
  }
  
  export interface WasmModule {
    WasmRenderer: new () => WasmRenderer;
  }
  
  export class LeveloWasmBridge {
    private readonly renderer: WasmRenderer;
  
    constructor(module: WasmModule) {
      this.renderer = new module.WasmRenderer();
    }
  
    executeBatch(operations: unknown[]): void {
      if (operations.length === 0) {
        return;
      }
  
      this.renderer.execute_batch(operations);
    }
  
    nodeCount(): number {
      return this.renderer.node_count();
    }
  }