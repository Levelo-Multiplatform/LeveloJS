// Public renderer API

// Core renderer
export { DefaultRenderer } from "./DefaultRenderer.js";
export { Renderer } from "./interfaces/Renderer.js";
export { RenderNode } from "./interfaces/RenderNode.js";

// Render tree
export { RenderTree } from "./tree/RenderTree.js";
export { InternalRenderNode } from "./tree/InternalRenderNode.js";
export { NodeFactory } from "./tree/NodeFactory.js";

// Snapshots
export { TreeSnapshotBuilder } from "./snapshot/TreeSnapshotBuilder.js";
export { DefaultSnapshotBuilder } from "./snapshot/DefaultSnapshotBuilder.js";
export { NodeSnapshot } from "./snapshot/NodeSnapshot.js";
export { RenderTreeSnapshot } from "./snapshot/RenderTreeSnapshot.js";

// Reconciliation
export { TreeDiffer } from "./reconcile/TreeDiffer.js";
export { NodeDiffer } from "./reconcile/NodeDiffer.js";
export { DiffContext } from "./reconcile/DiffContext.js";
export { DefaultTreeDiffer } from "./reconcile/DefaultTreeDiffer.js";
export { DefaultNodeDiffer } from "./reconcile/DefaultNodeDiffer.js";

// Operations and executor contracts
export {
  OperationExecutor,
  OperationExecutorRegistry,
} from "./operations/OperationExecutorRegistry.js";
export * from "./tree/operations/index.js";

// Commit
export { CommitCoordinator } from "./commit/CommitCoordinator.js";

// Pipeline
export { RenderPipeline } from "./pipeline/RenderPipeline.js";
export { DefaultRenderPipeline } from "./pipeline/DefaultRenderPipeline.js";
export { PipelineStage } from "./pipeline/PipelineStage.js";
export { RenderPipelineContext } from "./pipeline/RenderPipelineContext.js";
export { ValidationStage } from "./pipeline/ValidationStage.js";
export { CommitStage } from "./pipeline/CommitStage.js";

// Scheduling
export { Scheduler } from "./scheduler/Scheduler.js";
export { ImmediateScheduler } from "./scheduler/ImmediateScheduler.js";

// Platform abstraction
export { PlatformAdapter } from "./platforms/PlatformAdapter.js";

// Web platform
export { WebAdapter } from "./platforms/web/WebAdapter.js";
export { WebOperationExecutor } from "./platforms/web/WebOperationExecutor.js";
export { WebOperationRegistry } from "./platforms/web/WebOperationRegistry.js";
export { NativeNode, NativeNodeRegistry } from "./platforms/web/NativeNodeRegistry.js";

// Web executors
export { CreateElementExecutor } from "./platforms/web/executors/CreateElementExecutor.js";
export { CreateTextExecutor } from "./platforms/web/executors/CreateTextExecutor.js";
export { AppendChildExecutor } from "./platforms/web/executors/AppendChildExecutor.js";
export { RemoveChildExecutor } from "./platforms/web/executors/RemoveChildExecutor.js";
export { ReplaceChildExecutor } from "./platforms/web/executors/ReplaceChildExecutor.js";
export { InsertBeforeExecutor } from "./platforms/web/executors/InsertBeforeExecutor.js";
export { DeleteNodeExecutor } from "./platforms/web/executors/DeleteNodeExecutor.js";
export { SetPropertyExecutor } from "./platforms/web/executors/SetPropertyExecutor.js";
export { RemovePropertyExecutor } from "./platforms/web/executors/RemovePropertyExecutor.js";
export { SetStyleExecutor } from "./platforms/web/executors/SetStyleExecutor.js";
export { RemoveStyleExecutor } from "./platforms/web/executors/RemoveStyleExecutor.js";
export { SetTextExecutor } from "./platforms/web/executors/SetTextExecutor.js";
export { AddEventListenerExecutor } from "./platforms/web/executors/AddEventListenerExecutor.js";
export { RemoveEventListenerExecutor } from "./platforms/web/executors/RemoveEventListenerExecutor.js";

// Container / dependency injection
export { InjectionToken } from "./container/InjectionToken.js";
export { RendererContainer } from "./container/RendererContainer.js";
export {
  RENDERER_TOKEN,
  PLATFORM_ADAPTER_TOKEN,
  RENDER_PIPELINE_TOKEN,
  SCHEDULER_TOKEN,
  SNAPSHOT_BUILDER_TOKEN,
  TREE_DIFFER_TOKEN,
  COMMIT_COORDINATOR_TOKEN,
} from "./container/RendererTokens.js";
