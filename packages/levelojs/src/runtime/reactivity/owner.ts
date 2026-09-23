// src/runtime/reactivity/owner.ts

export interface Owner {
  cleanups: (() => void)[];
}

export let activeOwner: Owner | null = null;

export function setOwner(owner: Owner | null): Owner | null {
  const prev = activeOwner;
  activeOwner = owner;
  return prev;
}

/**
 * Executes a function inside an ownership scope.
 *
 * The owner's cleanups are collected during `fn()` and executed when the
 * scope exits. This gives `cleanup()` a place to register disposal routines
 * for anything created inside a component or effect body.
 */
export function runWithOwner<T>(owner: Owner, fn: () => T): T {
  const previous = setOwner(owner);

  try {
    return fn();
  } finally {
    setOwner(previous);
  }
}

/**
 * Runs every cleanup registered on an owner, then clears the list.
 *
 * Called by the renderer when a component is unmounted.
 */
export function disposeOwner(owner: Owner): void {
  const cleanups = owner.cleanups;

  owner.cleanups = [];

  for (const fn of cleanups) {
    try {
      fn();
    } catch (error) {
      console.error("[Levelo] Error during cleanup:", error);
    }
  }
}