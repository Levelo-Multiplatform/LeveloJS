Here's the complete `packages/vite-plugin-levelojs/README.md`. Replace the entire file with this:

```md
# vite-plugin-levelojs

Official Vite plugin for Levelo JS.

Transforms JSX and TSX into `h()` calls at compile time. No virtual DOM,
no reconciliation, no React runtime.

## Features

- JSX and TSX compilation for Levelo JS
- SVG namespace handling
- MathML namespace handling
- Source map support
- No React runtime required
- Runs before other Vite transforms (`enforce: 'pre'`)

## Installation

```bash
npm install levelojs vite-plugin-levelojs
```

or

```bash
pnpm add levelojs vite-plugin-levelojs
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { leveloPlugin } from "vite-plugin-levelojs";

export default defineConfig({
  plugins: [leveloPlugin()]
});
```

The plugin handles JSX transformation on its own. No esbuild `jsxFactory`
or `jsxFragment` configuration is needed.

## Importing `h`

The plugin does not inject the `h` factory. Files that use JSX must import
it from `levelojs`:

```tsx
import { h, render } from "levelojs";

function App() {
  return <h1>Hello Levelo</h1>;
}

render(App, document.getElementById("app"));
```

### Optional: automatic injection

If you prefer to skip the import in every file, Vite's `esbuild.jsxInject`
adds one for you:

```ts
export default defineConfig({
  plugins: [leveloPlugin()],
  esbuild: {
    jsxInject: `import { h } from "levelojs"`
  }
});
```

This works because the injected import lands at the top of the module
after the Levelo transform has already run. Use it or the explicit
import — not both, or you will get a duplicate `h` binding.

## What the transform produces

```tsx
<h1>Hello</h1>
```

becomes:

```ts
h("h1", null, "Hello");
```

Reactive expressions are wrapped as lazy getters so the renderer can bind
them to the signal they read:

```tsx
<span>{count()}</span>
```

becomes:

```ts
h("span", null, () => count());
```

The getter is materialized once for the initial mount and retained for
fine-grained updates. The component function is never re-executed.

## Supported Files

- `.jsx`
- `.tsx`

## API

### `leveloPlugin(options?)`

```ts
leveloPlugin({
  include,
  exclude,
});
```

| Option  | Type            | Description         |
| ------- | --------------- | ------------------- |
| include | `FilterPattern` | Files to include    |
| exclude | `FilterPattern` | Files to exclude    |

Both follow the same syntax as Vite's `createFilter`.

## Requirements

- `vite` (peer dependency)
- `levelojs` (must be installed in the consuming project)

## Resources

- Documentation: <https://levelojs.motionmind.me>
- Source: <https://github.com/MotionMind2007/Levelo-Js/tree/main/packages/vite-plugin-levelojs>

## License

MIT
```

That's the full file, top to bottom. Save it over the current `README.md` in `packages/vite-plugin-levelojs/`.

## Then

Confirm whether you applied the `CHANGELOG.md` update (item 5). It's in the message three turns back under "Item 5 — `levelojs/CHANGELOG.md`". If not, say so and I'll re-paste it as a single block.

Then pick a direction:

- **A** — Write tests
- **B** — Design 2 routing
- **C** — Pivot to Rust
- **D** — Docs and templates cleanup