import { describe, it, expect } from "vitest";
import { state, effect } from "./reactivity.js";
import { computed } from "./computed.js";
import { batch } from "./batch.js";

describe("state", () => {
  it("returns the initial value from the getter", () => {
    const [get] = state(42);
    expect(get()).toBe(42);
  });

  it("updates the value through the setter", () => {
    const [get, set] = state(0);
    set(5);
    expect(get()).toBe(5);
  });

  it("supports functional updates", () => {
    const [get, set] = state(10);
    set((prev) => prev + 1);
    set((prev) => prev * 2);
    expect(get()).toBe(22);
  });

  it("ignores writes that don't change the value", () => {
    const [get, set] = state(1);
    let runs = 0;

    effect(() => {
      get();
      runs++;
    });

    expect(runs).toBe(1);

    set(1); // same value
    expect(runs).toBe(1);

    set(2);
    expect(runs).toBe(2);
  });
});

describe("effect", () => {
  it("runs immediately on creation", () => {
    let runs = 0;

    effect(() => {
      runs++;
    });

    expect(runs).toBe(1);
  });

  it("re-runs when a tracked signal changes", () => {
    const [get, set] = state(0);
    let seen: number[] = [];

    effect(() => {
      seen.push(get());
    });

    set(1);
    set(2);

    expect(seen).toEqual([0, 1, 2]);
  });

  it("stops tracking after dispose", () => {
    const [get, set] = state(0);
    let runs = 0;

    const dispose = effect(() => {
      get();
      runs++;
    });

    expect(runs).toBe(1);

    dispose();
    set(1);

    expect(runs).toBe(1);
  });
});

describe("computed", () => {
  it("derives a value from a signal", () => {
    const [count, setCount] = state(2);
    const doubled = computed(() => count() * 2);

    expect(doubled()).toBe(4);

    setCount(5);
    expect(doubled()).toBe(10);
  });

  it("tracks multiple dependencies", () => {
    const [a, setA] = state(1);
    const [b, setB] = state(2);
    const sum = computed(() => a() + b());

    expect(sum()).toBe(3);

    setA(10);
    expect(sum()).toBe(12);

    setB(20);
    expect(sum()).toBe(30);
  });
});

describe("batch", () => {
  it("groups multiple updates into one effect run", () => {
    const [a, setA] = state(1);
    const [b, setB] = state(2);
    let runs = 0;

    effect(() => {
      a();
      b();
      runs++;
    });

    expect(runs).toBe(1);

    batch(() => {
      setA(10);
      setB(20);
    });

    expect(runs).toBe(2);
  });

  it("runs the batched effect synchronously after the batch completes", () => {
    const [value, setValue] = state(0);
    let observed = -1;

    effect(() => {
      observed = value();
    });

    batch(() => {
      setValue(1);
      setValue(2);
      setValue(3);
    });

    expect(observed).toBe(3);
  });
});