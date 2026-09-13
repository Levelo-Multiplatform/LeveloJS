import { Renderer } from "./interfaces/Renderer.js";
import { RenderTree } from "./tree/RenderTree.js";
import { PlatformAdapter } from "./platforms/PlatformAdapter.js";
import { DirectMountRenderer } from "./DirectMountRenderer.js";
import { ReactiveRuntime } from "./ReactiveRuntime.js";

/**
 * Shared renderer for direct DOM/native mounting.
 *
 * A render tree is consumed once to create native nodes. Reactive changes
 * bypass tree comparison and are handled by ReactiveRuntime bindings.
 */
export class DefaultRenderer implements Renderer {
  private mounted = false;

  private readonly mountRenderer: DirectMountRenderer;
  private readonly reactiveRuntime: ReactiveRuntime;

  constructor(private readonly adapter: PlatformAdapter) {
    this.mountRenderer = new DirectMountRenderer(adapter);
    this.reactiveRuntime = new ReactiveRuntime(adapter);
  }

  render(tree: RenderTree): void {
    if (this.mounted) {
      throw new Error(
        "[Levelo] A renderer instance can only mount one tree. Create a new renderer to replace it.",
      );
    }

    this.mountRenderer.mount(tree);
    this.reactiveRuntime.activate(tree.root);
    this.mounted = true;
  }

  dispose(tree: RenderTree): void {
    if (!this.mounted) return;
    this.reactiveRuntime.dispose(tree.root);
    this.mounted = false;
  }
}
