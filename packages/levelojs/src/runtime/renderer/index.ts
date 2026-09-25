// Public renderer API

// Core renderer
export { DefaultRenderer } from "./DefaultRenderer.js";
export type { Renderer } from "./interfaces/Renderer.js";
export type { RenderNode } from "./interfaces/RenderNode.js";

// Render tree
export { RenderTree } from "./tree/RenderTree.js";
export { InternalRenderNode } from "./tree/InternalRenderNode.js";
export { NodeFactory } from "./tree/NodeFactory.js";

// Direct rendering
export { DirectMountRenderer } from "./DirectMountRenderer.js";
export { ReactiveRuntime } from "./ReactiveRuntime.js";

// Operations and executor contracts
export type {
  OperationExecutor,
  OperationExecutorRegistry,
} from "./operations/OperationExecutorRegistry.js";
export * from "./tree/operations/index.js";

// Scheduling
export type { Scheduler } from "./scheduler/Scheduler.js";
export { ImmediateScheduler } from "./scheduler/ImmediateScheduler.js";

// Platform abstraction
export type { PlatformAdapter } from "./platforms/PlatformAdapter.js";

// Web platform
export { WebAdapter } from "./platforms/web/WebAdapter.js";
export type { DomPatch } from "./platforms/web/DomPatch.js";
export { NativeNodeRegistry } from "./platforms/web/NativeNodeRegistry.js";
export type { NativeNode } from "./platforms/web/NativeNodeRegistry.js";

// Container / dependency injection
export { InjectionToken } from "./container/InjectionToken.js";
export { RendererContainer } from "./container/RendererContainer.js";
export {
  RENDERER_TOKEN,
  PLATFORM_ADAPTER_TOKEN,
  SCHEDULER_TOKEN,
} from "./container/RendererTokens.js";

// The native renderer
export * from "./native/index.js";

// Native platform adapter
export { NativeAdapter } from "./platforms/native/NativeAdapter.js";