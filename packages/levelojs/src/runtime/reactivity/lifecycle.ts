// src/runtime/reactivity/lifecycle.ts
import { activeOwner } from "./owner.js";

/**
 * Registers a cleanup callback that fires when the active ownership scope
 * ends. Called from inside components or effects; a top-level call with no
 * active owner is a no-op.
 */
export function cleanup(fn: () => void): void {
  if (activeOwner) {
    activeOwner.cleanups.push(fn);
  }
}

/**
 * Schedules a task to run right after the current synchronous execution
 * completes.
 */
export function mount(fn: () => void): void {
  queueMicrotask(fn);
}