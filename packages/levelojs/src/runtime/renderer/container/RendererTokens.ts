import { InjectionToken } from "./InjectionToken.js";
import { PlatformAdapter } from "../platforms/PlatformAdapter.js";
import { Renderer } from "../interfaces/Renderer.js";
import { Scheduler } from "../scheduler/Scheduler.js";

export const RENDERER_TOKEN = new InjectionToken<Renderer>("Renderer");
export const PLATFORM_ADAPTER_TOKEN = new InjectionToken<PlatformAdapter>("PlatformAdapter");
export const SCHEDULER_TOKEN = new InjectionToken<Scheduler>("Scheduler");
