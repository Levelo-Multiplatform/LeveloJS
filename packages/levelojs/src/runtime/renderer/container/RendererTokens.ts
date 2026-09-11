import { InjectionToken } from "./InjectionToken.js";
import { PlatformAdapter } from "../platforms/PlatformAdapter.js";
import { Renderer } from "../interfaces/Renderer.js";
import { RenderPipeline } from "../pipeline/RenderPipeline.js";
import { Scheduler } from "../scheduler/Scheduler.js";
import { CommitCoordinator } from "../commit/CommitCoordinator.js";

export const RENDERER_TOKEN = new InjectionToken<Renderer>("Renderer");
export const PLATFORM_ADAPTER_TOKEN = new InjectionToken<PlatformAdapter>("PlatformAdapter");
export const RENDER_PIPELINE_TOKEN = new InjectionToken<RenderPipeline>("RenderPipeline");
export const SCHEDULER_TOKEN = new InjectionToken<Scheduler>("Scheduler");
export const COMMIT_COORDINATOR_TOKEN = new InjectionToken<CommitCoordinator>("CommitCoordinator");
