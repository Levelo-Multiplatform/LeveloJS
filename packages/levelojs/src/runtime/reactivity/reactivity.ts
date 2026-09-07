// src/runtime/reactivity/state.ts

import { setOwner, Owner } from "./owner.js";
import { isBatching, queue } from "./batch.js";

/**
 * Global tracker to register active effects.
 */
let activeEffect: (() => void) | null = null;

/**
 * Registers and executes an effect.
 * @param {Function} callback 
 */
export function effect(callback: () => void): void {

  const owner: Owner = { cleanups: [] };

  const execute = () => {

    if (owner.cleanups.length > 0) {
      owner.cleanups.forEach(cb => cb());
      owner.cleanups = [];
    }

    const prevOwner = setOwner(owner);

    activeEffect = execute;

    try {
      callback();
    } finally {
      activeEffect = null;
      setOwner(prevOwner);
    }
    
  };
  execute();
}

export type Getter<T> = () => T;
export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;

/**
 * Creates a reactive signal state.
 * @param {any} initialValue 
 * @returns {[Function, Function]} [getter, setter]
 */
export function state<T>(initialValue: T): [Getter<T>, Setter<T>] {
  let value = initialValue;
  const subscribers = new Set<() => void>();

  const getter: Getter<T> = () => {
    if (activeEffect) {
      subscribers.add(activeEffect);
    }
    return value;
  };

  const setter: Setter<T> = (newValue) => {

    // Core functional update logic to support state callbacks safely
    const resolvedValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

    if (value !== resolvedValue) {
      value = resolvedValue;
      subscribers.forEach((sub) => {
        if (isBatching) {
          queue.add(sub)
        } else {
          sub();
        }
      });
    }
  };

  return [getter, setter];
}
