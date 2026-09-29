# Levelo Core

`levelo-core` is the platform-neutral Rust core being developed for LeveloJS.

The goal is simple: keep Levelo's renderer architecture and fine-grained
reactive model intact while moving the performance-sensitive engine into a
native implementation.

The core deliberately does not know about the DOM, Android Views, Win32,
UIKit, or any other platform UI toolkit.

## Status

Pre-1.0. The crate is under active development and the API is not stable.

**Working:**

- All current modules (`operations`, `renderer`, `scheduler`, `tree`,
  `value`, `error`) are implemented and tested.
- The `renderer` module owns the render tree. It applies operations,
  updates node state, and emits platform-neutral `DomPatch` sequences
  describing what a platform adapter should do.
- The WASM binding exposes the initial-render pipeline end to end:
  JavaScript sends operations, the core returns `DomPatch[]`, and
  JavaScript applies them to the DOM.
- The Web adapter consumes patches and drives a real browser DOM. The
  playground exercises the supported HTML element surface and renders
  correctly in the browser.
- The custom JSX transform (`vite-plugin-levelojs`) converts `.tsx` sources
  into `h(...)` calls, wraps non-event expressions as lazy getters (the
  mechanism behind fine-grained props), and injects SVG/MathML namespace
  metadata.
- Core and JavaScript test suites pass.

**By design, in JavaScript:**

- Fine-grained reactivity (`state`, `effect`, `computed`, `batch`)
- Scheduling
- Component ownership and lifecycle (`cleanup`, `disposeOwner`)

These remain in JS because the boundary cost of crossing into WASM for
every signal read would dominate the operation. The Rust core owns rendering; JavaScript owns reactivity. This mirrors the design of every framework that has attempted the alternative.

**Not yet implemented:**

- Android adapter (the `DomPatch` protocol is ready for it)
- Windows adapter (same)
- A stable public API for the WASM binding

**Known limitations:**

- Event listener operations (`AddEventListener`, `RemoveEventListener`)
  are filtered at the boundary and handled entirely on the JavaScript
  side. They never reach the core.
- The JSX transform does not currently handle spread props (`{...rest}`)
  or namespaced attributes (`xlink:href`) — both need explicit handling.
- Reactive updates crossing the WASM boundary per-operation has not yet
  been characterized for performance. The design allows it; the cost of
  doing so is unmeasured.

The architecture diagram below describes the target shape. The Web
adapter exists today. Android and Windows are the next platforms.

## Architecture

```text
                 LeveloJS API
                      |
                      v
              +---------------+
              |  Levelo Core   |
              |     Rust       |
              +-------+-------+
                      |
              platform-neutral
               render work
               (DomPatch[])
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
         Web       Android     Windows
       Adapter      Adapter      Adapter
       (exists)    (planned)   (planned)