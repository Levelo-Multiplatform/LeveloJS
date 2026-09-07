import { effect } from "./reactivity/reactivity.js";
import { beginBuild, endBuild } from "./jsx-runtime.js";
import { InternalRenderNode } from "./renderer/tree/InternalRenderNode.js";
import { RenderTree } from "./renderer/tree/RenderTree.js";
import { DefaultRenderer } from "./renderer/DefaultRenderer.js";
import { CommitCoordinator } from "./renderer/commit/CommitCoordinator.js";
import { DefaultSnapshotBuilder } from "./renderer/snapshot/DefaultSnapshotBuilder.js";
import { DefaultNodeDiffer } from "./renderer/reconcile/DefaultNodeDiffer.js";
import { DefaultTreeDiffer } from "./renderer/reconcile/DefaultTreeDiffer.js";
import { NativeNodeRegistry } from "./renderer/platforms/web/NativeNodeRegistry.js";
import { WebOperationRegistry } from "./renderer/platforms/web/WebOperationRegistry.js";
import { WebAdapter } from "./renderer/platforms/web/WebAdapter.js";
import { DefaultRenderPipeline } from "./renderer/pipeline/DefaultRenderPipeline.js";
import { ValidationStage } from "./renderer/pipeline/ValidationStage.js";
import { CommitStage } from "./renderer/pipeline/CommitStage.js";
import { ImmediateScheduler } from "./renderer/scheduler/ImmediateScheduler.js";
import { RendererContainer } from "./renderer/container/RendererContainer.js";
import {
  PLATFORM_ADAPTER_TOKEN,
  RENDERER_TOKEN,
  RENDER_PIPELINE_TOKEN,
  SCHEDULER_TOKEN,
  SNAPSHOT_BUILDER_TOKEN,
  TREE_DIFFER_TOKEN,
  COMMIT_COORDINATOR_TOKEN,
} from "./renderer/container/RendererTokens.js";

export type RenderInput = InternalRenderNode | (() => InternalRenderNode);

interface MountedRenderer {
  renderer: DefaultRenderer;
  adapter: WebAdapter;
  registry: NativeNodeRegistry;
  container: HTMLElement;
  mountedRoot: Node | null;
}

const mounted = new WeakMap<HTMLElement, MountedRenderer>();

function createRenderer(container: HTMLElement): MountedRenderer {
  const services = new RendererContainer();
  const registry = new NativeNodeRegistry();
  const operations = new WebOperationRegistry(registry);
  const adapter = new WebAdapter(operations, registry);
  const coordinator = new CommitCoordinator();
  const snapshotBuilder = new DefaultSnapshotBuilder();
  const nodeDiffer = new DefaultNodeDiffer();
  const treeDiffer = new DefaultTreeDiffer(nodeDiffer);
  const pipeline = new DefaultRenderPipeline([
    new ValidationStage(),
    new CommitStage(coordinator),
  ]);
  const scheduler = new ImmediateScheduler();

  services
    .provide(PLATFORM_ADAPTER_TOKEN, adapter)
    .provide(RENDER_PIPELINE_TOKEN, pipeline)
    .provide(SCHEDULER_TOKEN, scheduler)
    .provide(SNAPSHOT_BUILDER_TOKEN, snapshotBuilder)
    .provide(TREE_DIFFER_TOKEN, treeDiffer)
    .provide(COMMIT_COORDINATOR_TOKEN, coordinator);

  const renderer = new DefaultRenderer(
    services.resolve(PLATFORM_ADAPTER_TOKEN),
    services.resolve(SNAPSHOT_BUILDER_TOKEN),
    services.resolve(TREE_DIFFER_TOKEN),
    services.resolve(RENDER_PIPELINE_TOKEN),
    services.resolve(SCHEDULER_TOKEN),
  );

  services.provide(RENDERER_TOKEN, renderer);

  const instance: MountedRenderer = {
    renderer: services.resolve(RENDERER_TOKEN) as DefaultRenderer,
    adapter: services.resolve(PLATFORM_ADAPTER_TOKEN) as WebAdapter,
    registry,
    container,
    mountedRoot: null,
  };

  mounted.set(container, instance);
  return instance;
}

function renderOnce(input: RenderInput, instance: MountedRenderer): void {
  beginBuild();

  try {
    const root = typeof input === "function" ? input() : input;

    if (!(root instanceof InternalRenderNode)) {
      throw new TypeError(
        "[Levelo] render() expected a Levelo element or component function.",
      );
    }

    instance.renderer.render(new RenderTree(root));

    const nativeRoot = instance.registry.resolve<Node>(root.id);

    if (instance.mountedRoot !== nativeRoot) {
      if (instance.mountedRoot) {
        instance.adapter.unmount(instance.container, instance.mountedRoot);
      }

      instance.adapter.mount(instance.container, root.id);
      instance.mountedRoot = nativeRoot;
    }
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
  if (!instance) {
    instance = createRenderer(container);
  }

  if (typeof input === "function") {
    effect(() => renderOnce(input, instance!));
    return;
  }

  renderOnce(input, instance);
}
