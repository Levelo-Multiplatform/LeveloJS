import { setOwner, Owner } from "./owner.js";
import { isBatching, queue } from "./batch.js";

type Subscriber = () => void;
type Dependency = Set<Subscriber>;

/** The effect currently collecting signal dependencies. */
let activeEffect: ReactiveEffect | null = null;

class ReactiveEffect {
  private readonly dependencies = new Set<Dependency>();
  private disposed = false;
  private running = false;
  private owner: Owner | null = null;

  constructor(private readonly callback: () => void) {}

  run(): void {
    if (this.disposed || this.running) return;

    this.running = true;
    this.cleanupDependencies();
    this.runOwnerCleanups();

    const owner: Owner = { cleanups: [] };
    this.owner = owner;
    const previousOwner = setOwner(owner);
    const previousEffect = activeEffect;
    activeEffect = this;

    try {
      this.callback();
    } finally {
      activeEffect = previousEffect;
      setOwner(previousOwner);
      this.running = false;
    }
  }

  track(dependency: Dependency): void {
    if (this.disposed) return;
    dependency.add(this.runBound);
    this.dependencies.add(dependency);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanupDependencies();
    this.runOwnerCleanups();
  }

  private readonly runBound = () => this.run();

  private cleanupDependencies(): void {
    for (const dependency of this.dependencies) {
      dependency.delete(this.runBound);
    }
    this.dependencies.clear();
  }

  private runOwnerCleanups(): void {
    const cleanups = this.owner?.cleanups ?? [];
    this.owner = null;

    for (const cleanup of cleanups) cleanup();
  }
}

export type Getter<T> = () => T;
export type Setter<T> = (newValue: T | ((prev: T) => T)) => void;
export type EffectDisposer = () => void;

/**
 * Creates a reactive effect and returns a disposer for its subscriptions.
 */
export function effect(callback: () => void): EffectDisposer {
  const reactiveEffect = new ReactiveEffect(callback);
  reactiveEffect.run();
  return () => reactiveEffect.dispose();
}

/** Creates a fine-grained reactive signal. */
export function state<T>(initialValue: T): [Getter<T>, Setter<T>] {
  let value = initialValue;
  const subscribers = new Set<Subscriber>();

  const getter: Getter<T> = () => {
    if (activeEffect) {
      activeEffect.track(subscribers);
    }
    return value;
  };

  const setter: Setter<T> = (newValue) => {
    const resolvedValue =
      typeof newValue === "function"
        ? (newValue as (prev: T) => T)(value)
        : newValue;

    if (Object.is(value, resolvedValue)) return;

    value = resolvedValue;

    for (const subscriber of [...subscribers]) {
      if (isBatching) {
        queue.add(subscriber);
      } else {
        subscriber();
      }
    }
  };

  return [getter, setter];
}
