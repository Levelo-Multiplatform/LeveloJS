# Levelo JS

Levelo JS is a lightweight fine-grained UI runtime with a shared renderer and platform-specific adapters.

## Rendering model

Levelo does not use a Virtual DOM, tree reconciliation, or tree diffing for reactive updates.

The renderer creates the initial native structure once. Reactive expressions then subscribe to their own signals and update only the native node, property, style, event, or dynamic child they own.

```text
Signal
  ↓
Reactive binding
  ↓
Direct renderer update
  ↓
Platform adapter
  ↓
Native UI
```

The internal `RenderTree` provides structural information for initial mounting and ownership. It is not compared against a previous tree when a signal changes.

## Web usage

Install the runtime and the Vite compiler plugin:

```bash
npm install levelojs
npm install -D vite vite-plugin-levelojs
```

Then configure Vite:

```ts
import { defineConfig } from "vite";
import { leveloPlugin } from "vite-plugin-levelojs";

export default defineConfig({
  plugins: [leveloPlugin()],
});
```

Use Levelo without knowing anything about the renderer internals:

```tsx
import { render } from "levelojs";

function App() {
  return (
    <div>
      <h1>Hello Levelo</h1>
      <p>The web renderer is running.</p>
    </div>
  );
}

render(App, document.getElementById("app"));
```

## Fine-grained updates

Reactive JSX expressions are compiled into lazy getters. This lets Levelo attach each expression to the signal it actually reads.

```tsx
function Counter() {
  const [count, setCount] = state(0);

  return (
    <div>
      <span>{count()}</span>
      <button onclick={() => setCount(count() + 1)}>
        Increment
      </button>
    </div>
  );
}
```

Changing `count` updates the existing `span` text node. The `Counter` function does not need to execute again, and no tree diff is calculated.

## Public API

- `h()` creates the platform-neutral render structure used for initial mounting.
- `render()` mounts a Levelo component into a DOM container.
- `state()` and the existing reactive primitives remain available through the package entry point.
- Platform adapters provide the native implementation of renderer operations.

The Android renderer can consume the same shared renderer contracts while providing Android-specific native executors.
