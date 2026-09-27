# Levelo

A cross-platform UI runtime. Fine-grained reactivity lives in JavaScript.
The renderer and its render tree live in Rust, compiled to WebAssembly.
Platform adapters translate the core's output into native operations.

Levelo is not a Virtual DOM framework. It does not diff trees. It does not
re-run components on state change. It compiles reactive JSX into bindings
that update the specific native node a signal belongs to.

## Why this architecture

Most UI frameworks put everything in one language. React, Vue, and Svelte
all live entirely in JavaScript and pay the cost of describing UI in JS.
Flutter puts everything in Dart and pays the cost of not being native
anywhere. React Native bridges to native views but keeps rendering logic
in JS.

Levelo's bet is different: split rendering and reactivity across the
language boundary that each is best suited for.

**Rendering goes in Rust** because it is:
- inherently stateful (node identity, parent/child links, lifecycle)
- performance-sensitive on structural changes
- something every platform needs and none should re-implement

**Reactivity stays in JavaScript** because it is:
- cheap to express as closures and function calls
- naturally synchronous and fine-grained
- something whose cost is dominated by *crossing* boundaries, not by
  the work itself

The result is one renderer, one set of invariants, one patch protocol —
and per-platform adapters that are thin by design.

## Status

Pre-1.0. The API is not stable.

| Piece | State |
|---|---|
| Rust core (`levelo-core`) | Implemented and tested |
| Web renderer + adapter | Working |
| JSX transform (`vite-plugin-levelojs`) | Working |
| Fine-grained reactivity | Verified by test |
| Android adapter | Planned |
| Windows adapter | Planned |
| Stable WASM public API | Not yet defined |

## Install and use

```bash
npm install levelojs
npm install -D vite vite-plugin-levelojs
```

Configure Vite:

```ts
import { defineConfig } from "vite";
import { leveloPlugin } from "vite-plugin-levelojs";

export default defineConfig({
  plugins: [leveloPlugin()],
});
```

A complete component:

```tsx
import { render, state } from "levelojs";

function App() {
  const [count, setCount] = state(0);
  const [name, setName] = state("world");

  return (
    <main>
      <h1>Hello, {name()}</h1>
      <p>Count: {count()}</p>

      <button onClick={() => setCount(count() + 1)}>Increment</button>

      <input
        type="text"
        value={name()}
        onInput={(e: Event) =>
          setName((e.currentTarget as HTMLInputElement).value)
        }
      />
    </main>
  );
}

render(App, document.getElementById("app"));
```

## Rendering model

Levelo does not use a Virtual DOM, tree reconciliation, or tree diffing.

When a component is mounted, the JSX transform has already turned it into
a tree of `InternalRenderNode`s. Reactive expressions inside that tree —
`{count()}`, `value={name()}`, `style={...}` — were compiled into lazy
bindings. During mount, each binding is subscribed to the signals it
reads.

When a signal changes, the binding fires. The runtime produces a targeted
operation describing the change, sends it across the WASM boundary to
the Rust core, and receives back a `DomPatch` the platform adapter
applies directly.

```text
signal change
      ↓
reactive binding (JS)
      ↓
targeted operation
      ↓
WASM boundary
      ↓
Rust core: apply_batch → DomPatch[]
      ↓
WASM boundary
      ↓
platform adapter applies patches
      ↓
native UI
```

The `RenderTree` is not compared against a previous render. It is a
structural description used for initial mount and ownership tracking. It
is never the input to a diff.

This behavior is verified by
`packages/levelojs/src/runtime/renderer/reactive-rerender.test.ts`, which
asserts that a signal change does not re-invoke the component function.

## Architecture

### The Rust core

The core owns:

- **Node identity.** Every element and text node has a stable `NodeId`.
- **Structural relationships.** Parent/child links, sibling order,
  lifecycle.
- **Renderer state.** Properties, styles, text content per node.
- **Patch emission.** Translating operations into platform-neutral
  `DomPatch` sequences.

The core enforces structural invariants:
- No cycles. A node cannot become its own ancestor.
- One parent per node. Re-attaching moves rather than duplicates.
- Idempotent attachment. Attaching a child to its current parent is a
  no-op.
- Correct index handling. `ReplaceChild` and `InsertBefore` adjust
  sibling positions consistently.

The core does not touch the DOM, Android Views, Win32, or UIKit. It has
no dependencies on any platform toolkit.

### The WASM boundary

The boundary is deliberately narrow. Two directions:

**JavaScript → Rust:** an ordered array of `NativeOperation` values.

```ts
type NativeOperation =
  | { type: "CreateElement"; node: number; elementType: string }
  | { type: "CreateText"; node: number; text: string }
  | { type: "AppendChild"; parent: number; child: number }
  | { type: "InsertBefore"; parent: number; child: number; reference: number }
  | { type: "ReplaceChild"; parent: number; newChild: number; oldChild: number }
  | { type: "RemoveChild"; parent: number; child: number }
  | { type: "DeleteNode"; node: number }
  | { type: "SetProperty"; node: number; name: string; value: NativeValue }
  | { type: "RemoveProperty"; node: number; name: string }
  | { type: "SetStyle"; node: number; name: string; value: string }
  | { type: "RemoveStyle"; node: number; name: string }
  | { type: "SetText"; node: number; text: string };
```

**Rust → JavaScript:** an ordered array of `DomPatch` values.

```ts
type DomPatch =
  | { type: "CreateElement"; node: number; tag: string }
  | { type: "CreateText"; node: number; text: string }
  | { type: "SetProperty"; node: number; name: string; value: unknown }
  | { type: "RemoveProperty"; node: number; name: string }
  | { type: "SetStyle"; node: number; name: string; value: string }
  | { type: "RemoveStyle"; node: number; name: string }
  | { type: "SetText"; node: number; text: string }
  | { type: "AppendChild"; parent: number; child: number }
  | { type: "InsertBefore"; parent: number; child: number; reference: number }
  | { type: "RemoveChild"; parent: number; child: number }
  | { type: "ReplaceChild"; parent: number; newChild: number; oldChild: number }
  | { type: "DeleteNode"; node: number };
```

Patches are emitted in dependency order. A node is created before it is
referenced; it is unparented before it is removed. Adapters apply them
sequentially, without lookahead.

Event listener operations are filtered at the boundary. JavaScript
functions cannot cross into Rust, so `AddEventListener` and
`RemoveEventListener` stay entirely in the JS layer.

### The JSX transform

`vite-plugin-levelojs` is a Babel plugin that runs before Vite's default
transform. It converts `.tsx` sources into calls to `h()`:

```tsx
<span>{count()}</span>
```

becomes:

```js
h("span", {}, () => count());
```

Two rules matter:

- **Reactive props and styles become object getters.** `value={name()}`
  becomes `{ get value() { return name(); } }`. The getter is retained at
  runtime so the binding can subscribe to the signal.
- **Reactive children become arrow wrappers.** `{count()}` becomes
  `() => count()`. The wrapper is called once for the initial value and
  retained as a reactive binding.

Event props are passed through as direct function values, since they
need to be attached to native nodes.

### The DomPatch protocol

`DomPatch` is the contract between the Rust core and every platform
adapter. It is intentionally a flat, ordered list rather than a tree:
each patch is one concrete mutation, and applying them in order produces
the correct final state without any diffing.

This makes adapters trivial to write. A Web adapter is a switch over
patch types calling `document.createElement`, `parent.appendChild`, and
so on. An Android adapter would be a switch over the same patch types
calling into the Android view hierarchy. The protocol does not know or
care which platform it is targeting.

### Platform adapters

The Web adapter is the first implementation and the current reference.
Android and Windows adapters are planned against the same patch protocol.

The `PlatformAdapter` interface is the extension point:

```ts
interface PlatformAdapter<THost = unknown> {
  execute(batch: OperationBatch): void;
  mount(host: THost, rootId: number): void;
  unmount(host: THost, rootId: number): void;
  dispose?(): void;
}
```

## Repository layout

```text
packages/
  levelojs/              — the npm package (runtime + renderer glue)
  vite-plugin-levelojs/  — the JSX compiler plugin
  create-levelo-app/     — project scaffolding
native/
  levelo-core/           — the Rust renderer core
  levelo-bindings/       — WASM and other language bindings
playground/              — the demo and manual inspection app
```

## Working on Levelo

### Prerequisites

- Node.js 20+
- Rust toolchain (stable)
- `wasm-pack` for building the WASM bindings

### First-time setup

```bash
git clone https://github.com/Levelo-Multiplatform/LeveloJS.git
cd LeveloJS
npm install                # installs all workspace packages
```

### Building

```bash
# Build the Rust core and its WASM bindings
cd native/levelo-bindings/wasm
wasm-pack build --target bundler
wasm-pack build --target nodejs --out-dir pkg-node

# Build the JS packages
cd ../../../packages/levelojs
npm run build

cd ../vite-plugin-levelojs
npm run build
```

### Running the playground

```bash
cd playground
npm run dev
```

Open http://localhost:6262. The playground exercises every supported HTML
element and includes interactive sections for verifying reactivity.

### Running tests

```bash
# Rust core
cd native/levelo-core
cargo test

# JavaScript packages
cd packages/levelojs
npm test

cd ../vite-plugin-levelojs
npm test
```

### Where to start reading

- **Core invariants:** `native/levelo-core/src/tree.rs` — the `NodeStore`
  and its structural guarantees.
- **Operations and patches:** `native/levelo-core/src/operations.rs` and
  `native/levelo-core/src/patch.rs`.
- **The WASM bridge:** `native/levelo-bindings/wasm/src/lib.rs`.
- **The JSX transform:** `packages/vite-plugin-levelojs/src/index.ts`.
- **The JS runtime:** `packages/levelojs/src/runtime/`.

## Known limitations

- **Event listeners stay in JavaScript.** They are filtered at the
  boundary and never reach the core.
- **The JSX transform does not handle spread props (`{...rest}`) or
  namespaced attributes (`xlink:href`).** Both need explicit handling
  before those patterns can be used.
- **The per-update cost of crossing the WASM boundary is unmeasured.**
  Every reactive update crosses. Whether that cost dominates for
  signal-heavy components is an open question that will be answered by
  profiling, not speculation.
- **The test environment does not load the WASM module.** Tests that
  exercise `render()` cannot currently reach the Rust core. Tree-level
  tests (as in `reactive-rerender.test.ts`) work; full-pipeline tests
  need a mock bridge or a WASM module resolvable at test time.
- **No stable public API for the WASM binding.** The bridge exists and
  works, but its shape may change before 1.0.

## License

MIT.