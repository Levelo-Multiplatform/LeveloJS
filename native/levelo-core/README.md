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
- The WASM binding exposes the full pipeline: JavaScript sends operations,
  the core returns `DomPatch[]`, and JavaScript applies them to the DOM.
- The Web adapter consumes patches and drives a real browser DOM. The
  playground exercises every supported HTML element and confirms the
  pipeline end-to-end.
- 28 core tests and 70 JavaScript tests pass.

**By design, in JavaScript:**

- Fine-grained reactivity (`state`, `effect`, `computed`, `batch`)
- Scheduling
- Component ownership and lifecycle (`cleanup`, `disposeOwner`)

These remain in JS because the boundary cost of crossing into WASM for
every signal read would dominate the operation. The core owns rendering;
JavaScript owns reactivity. This mirrors the design of every framework
that has attempted the alternative.

**Not yet implemented:**

- Android adapter (the `DomPatch` protocol is ready for it)
- Windows adapter (same)
- A stable public API for the WASM binding

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