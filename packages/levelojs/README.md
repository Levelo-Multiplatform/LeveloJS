# Levelo JS

Levelo JS is a lightweight UI runtime with a platform-neutral render tree and platform-specific renderers.

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

The public API owns the renderer construction. Application code does not need to create nodes, snapshots, differs, operation registries, executors, or platform adapters.

## Public API

- `h()` creates Levelo render nodes.
- `render()` mounts a Levelo component into a DOM container.
- `state()` and the existing reactive primitives remain available through the package entry point.

The renderer pipeline is internal:

`h() → RenderTree → Snapshot → Diff → OperationBatch → Commit → WebAdapter → DOM`

The Android renderer will consume the same operation contract without changing the public component API.
