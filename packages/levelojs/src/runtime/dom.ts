import { beginBuild, endBuild } from "./jsx-runtime.js";
import { InternalRenderNode } from "./renderer/tree/InternalRenderNode.js";
import { RenderTree } from "./renderer/tree/RenderTree.js";
import { DefaultRenderer } from "./renderer/DefaultRenderer.js";
import { NativeNodeRegistry } from "./renderer/platforms/web/NativeNodeRegistry.js";
import { WebOperationRegistry } from "./renderer/platforms/web/WebOperationRegistry.js";
import { WebAdapter } from "./renderer/platforms/web/WebAdapter.js";

export type RenderInput = InternalRenderNode | (() => InternalRenderNode);

interface MountedRenderer {
  renderer: DefaultRenderer;
  adapter: WebAdapter;
  registry: NativeNodeRegistry;
  container: HTMLElement;
  mountedRoot: Node | null;
  tree: RenderTree | null;
}

const mounted = new WeakMap<HTMLElement, MountedRenderer>();

function createRenderer(container: HTMLElement): MountedRenderer {
  const registry = new NativeNodeRegistry();
  const operations = new WebOperationRegistry(registry);
  const adapter = new WebAdapter(operations, registry);

  const instance: MountedRenderer = {
    renderer: new DefaultRenderer(adapter),
    adapter,
    registry,
    container,
    mountedRoot: null,
    tree: null,
  };

  mounted.set(container, instance);
  return instance;
}

function renderOnce(
  input: RenderInput,
  instance: MountedRenderer,
): void {
  beginBuild();

  try {
    // Components execute once. Reactive JSX expressions are represented by
    // bindings and do not cause the component function to run again.
    const root = typeof input === "function" ? input() : input;

    if (!(root instanceof InternalRenderNode)) {
      throw new TypeError(
        "[Levelo] render() expected a Levelo element or component function.",
      );
    }

    const tree = new RenderTree(root);
    instance.renderer.render(tree);
    instance.tree = tree;

    const nativeRoot = instance.registry.resolve<Node>(root.id);
    instance.adapter.mount(instance.container, root.id);
    instance.mountedRoot = nativeRoot;
  } finally {
    endBuild();
  }
}

export function render(
  input: RenderInput,
  container: HTMLElement | null,
): void {
  if (!container) {
    throw new Error("[Levelo] render() requires a valid DOM container.");
  }

  let instance = mounted.get(container);
  if (!instance) instance = createRenderer(container);

  if (instance.tree) {
    throw new Error(
      "[Levelo] This container is already mounted. Use the existing reactive state to update it.",
    );
  }

  renderOnce(input, instance);
}
