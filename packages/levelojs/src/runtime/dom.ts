import { beginBuild, endBuild } from "./jsx-runtime.js";
import { InternalRenderNode } from "./renderer/tree/InternalRenderNode.js";
import { RenderTree } from "./renderer/tree/RenderTree.js";
import { DefaultRenderer } from "./renderer/DefaultRenderer.js";
import { NativeNodeRegistry } from "./renderer/platforms/web/NativeNodeRegistry.js";
import { WebOperationRegistry } from "./renderer/platforms/web/WebOperationRegistry.js";
import { WebAdapter } from "./renderer/platforms/web/WebAdapter.js";
import {
  type Owner,
  setOwner,
  disposeOwner,
} from "./reactivity/owner.js";

export type RenderInput = InternalRenderNode | (() => InternalRenderNode);

interface MountedRenderer {
  renderer: DefaultRenderer;
  adapter: WebAdapter;
  registry: NativeNodeRegistry;
  container: HTMLElement;
  mountedRoot: Node | null;
  tree: RenderTree | null;
  owner: Owner | null;
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
    owner: null,
  };

  mounted.set(container, instance);
  return instance;
}

function renderOnce(input: RenderInput, instance: MountedRenderer): void {
  beginBuild();

  const owner: Owner = { cleanups: [] };
  const previousOwner = setOwner(owner);

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
    instance.owner = owner;

    const nativeRoot = instance.registry.resolve<Node>(root.id);
    instance.adapter.mount(instance.container, root.id);
    instance.mountedRoot = nativeRoot;
  } finally {
    setOwner(previousOwner);
    endBuild();
  }
}

/**
 * Mounts a Levelo component or element into a DOM container.
 *
 * A container can only host one mounted tree at a time. Call `unmount()`
 * before rendering into a container that is already in use.
 */
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
      "[Levelo] This container is already mounted. Call unmount() before rendering again.",
    );
  }

  renderOnce(input, instance);
}

/**
 * Unmounts the tree currently mounted in a container.
 *
 * Disposes reactive bindings, detaches the native root, and clears the
 * renderer state so the container can be reused.
 *
 * This is a no-op when the container is not mounted.
 */
export function unmount(container: HTMLElement | null): void {
  if (!container) return;

  const instance = mounted.get(container);
  if (!instance || !instance.tree) return;

  instance.renderer.dispose(instance.tree);

  if (instance.mountedRoot && instance.mountedRoot.parentNode === container) {
    container.removeChild(instance.mountedRoot);
  }

  if (instance.owner) {
    disposeOwner(instance.owner);
    instance.owner = null;
  }

  instance.registry.clear();
  instance.mountedRoot = null;
  instance.tree = null;

  mounted.delete(container);
}