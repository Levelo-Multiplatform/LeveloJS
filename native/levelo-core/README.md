# Levelo Core

`levelo-core` is the platform-neutral Rust core being developed for LeveloJS.

The goal is simple: keep Levelo's renderer architecture and fine-grained
reactive model intact while moving the performance-sensitive engine into a
native implementation.

The core deliberately does not know about the DOM, Android Views, Win32,
UIKit, or any other platform UI toolkit.

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
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
         Web       Android     Windows
       Adapter      Adapter      Adapter
```

The core owns shared rendering/runtime behavior. Platform adapters own the
last-mile work of creating and updating native objects.

## Current modules

- `operations` — platform-neutral renderer instructions.
- `renderer` — renderer state and the renderer boundary.
- `scheduler` — a small update scheduler foundation.
- `tree` — node identity and parent/child bookkeeping.
- `value` — values that can safely cross the renderer boundary.
- `error` — shared core errors.

This crate intentionally has no external dependencies yet. The first version
of the core should stay small and easy to audit.

## Build

```bash
cargo check
cargo test
cargo build
```

For a quick local validation:

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
```
