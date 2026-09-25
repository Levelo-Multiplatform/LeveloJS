import { beginBuild, endBuild } from "./jsx-runtime.js";
import { InternalRenderNode } from "./renderer/tree/InternalRenderNode.js";
import { RenderTree } from "./renderer/tree/RenderTree.js";
import { DefaultRenderer } from "./renderer/DefaultRenderer.js";
import { NativeNodeRegistry } from "./renderer/platforms/web/NativeNodeRegistry.js";
import { WebAdapter } from "./renderer/platforms/web/WebAdapter.js";
import { LeveloWasmBridge } from "./renderer/native/LeveloWasmBridge.js";
import type { NativeRendererBridge } from "./renderer/native/NativeRendererBridge.js";
import {
  type Owner,
  setOwner,
  disposeOwner,
} from "./reactivity/owner.js";

export type RenderInput = InternalRenderNode | (() => InternalRenderNode);

export type BridgeFactory = () => Promise<NativeRendererBridge>;

let bridgeFactory: BridgeFactory = async () => {
  const bridge = new LeveloWasmBridge();
  await bridge.initialize();
  return bridge;
};

export function setBridgeFactory(factory: BridgeFactory | null): void {
  bridgeFactory = factory ?? (async () => {
    const bridge = new LeveloWasmBridge();
    await bridge.initialize();
    return bridge;
  });
}

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

/**
 * A materialized render input: the concrete root node plus the ownership
 * scope that was active while the component executed.
 */
interface BuiltRoot {
  root: InternalRenderNode;
  owner: Owner;
}

interface PendingRenderer {
  bridgePromise: Promise<NativeRendererBridge>;
  pendingRoots: BuiltRoot[];
}

const pending = new WeakMap<HTMLElement, PendingRenderer>();

/**
 * Materializes the render input into a concrete `InternalRenderNode` inside
 * an ownership scope.
 *
 * Runs the component function exactly once and captures everything it
 * registered via `cleanup()` or `computed()`. Errors from invalid input
 * throw synchronously so the caller sees them immediately.
 */
function buildRoot(input: RenderInput): BuiltRoot {
  const owner: Owner = { cleanups: [] };
  const previousOwner = setOwner(owner);

  try {
    const root = typeof input === "function" ? input() : input;

    if (!(root instanceof InternalRenderNode)) {
      throw new TypeError(
        "[Levelo] render() expected a Levelo element or component function.",
      );
    }

    return { root, owner };
  } finally {
    setOwner(previousOwner);
  }
}

function renderOnce(built: BuiltRoot, instance: MountedRenderer): void {
  beginBuild();

  try {
    const tree = new RenderTree(built.root);
    instance.renderer.render(tree);
    instance.tree = tree;
    instance.owner = built.owner;

    const nativeRoot = instance.registry.resolve<Node>(built.root.id);
    instance.adapter.mount(instance.container, built.root.id);
    instance.mountedRoot = nativeRoot;
  } finally {
    endBuild();
  }
}

/**
 * Mounts a Levelo component or element into a DOM container.
 *
 * The first call for a container begins loading the native bridge
 * asynchronously. If the bridge is not yet ready, the built root is queued
 * and mounted once loading completes. Subsequent calls require the bridge
 * to be ready and mount synchronously.
 *
 * Throws synchronously if the container is null, already mounted, or the
 * input is not a Levelo element or component function.
 */
export function render(
  input: RenderInput,
  container: HTMLElement | null,
): void {
  if (!container) {
    throw new Error("[Levelo] render() requires a valid DOM container.");
  }

  // Materialize and validate the input synchronously, inside an ownership
  // scope so any `cleanup()` or `computed()` calls made during component
  // execution register with the correct owner.
  const built = buildRoot(input);

  const existing = mounted.get(container);

  if (existing) {
    if (existing.tree) {
      throw new Error(
        "[Levelo] This container is already mounted. Call unmount() before rendering again.",
      );
    }

    renderOnce(built, existing);
    return;
  }

  const inFlight = pending.get(container);

  if (inFlight) {
    inFlight.pendingRoots.push(built);
    return;
  }

  const entry: PendingRenderer = {
    bridgePromise: bridgeFactory(),
    pendingRoots: [built],
  };

  pending.set(container, entry);

  entry.bridgePromise
    .then((bridge) => {
      pending.delete(container);

      const registry = new NativeNodeRegistry();
      const adapter = new WebAdapter(bridge, registry);

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

      const first = entry.pendingRoots[0];

      if (first !== undefined) {
        renderOnce(first, instance);
      }
    })
    .catch((error) => {
      pending.delete(container);

      console.error(
        "[Levelo] Failed to initialize the native renderer bridge.",
        error,
      );

      throw error;
    });
}

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