import { Scheduler } from "./Scheduler.js";

/** Synchronous scheduler. The boundary can later be replaced by a queued scheduler. */
export class ImmediateScheduler implements Scheduler {
  schedule(task: () => void): void {
    task();
  }
}
