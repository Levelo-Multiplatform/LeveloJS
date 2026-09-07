// src/runtime/reactivity/lifecycle.ts
import { activeOwner } from "./owner.js";

/**
 * Registers a cleanup callback that fires immediately when the active context or route changes.
 * Helps cleanly wipe out intervals, event listeners, and memory footprints.
 */
export function cleanup(fn: () => void): void {
    if (activeOwner) {
        activeOwner.cleanups.push(fn);
    } else {
        console.warn('[Levelo] cleanup() must be executed inside a reactive state or component context.');
    }
}

/**
 * Shedules a task to run right after the browser finishes the current synchronous layout paint.
 */
export function mount(fn: () => void): void {
    queueMicrotask(() => {
        fn();
    })
}