# vite-plugin-levelojs

Official Vite plugin for Levelo JS.

Transforms JSX into optimized `h()` calls at compile time with zero Virtual DOM overhead.

## Features

- JSX compilation for Levelo JS
- TypeScript (.tsx) support
- SVG namespace handling
- MathML namespace handling
- No React runtime required
- Source map support

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
  plugins: [leveloPlugin()],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'fragment',
    jsxInject: `import { h } from 'levelojs'`
  }
});
```

## Example

```tsx
import { render } from "levelojs";

function App() {
  return <h1>Hello Levelo</h1>;
}

render(App, document.getElementById("app"));
```

The plugin compiles JSX into optimized runtime calls:

```tsx
<h1>Hello</h1>
```

↓

```ts
h("h1", null, "Hello");
```

## Supported Files

- .jsx
- .tsx

## API

### `leveloPlugin(options?)`

```ts
leveloPlugin({
  include,
  exclude,
});
```

| Option| Description |
| ------- | ---- |
| include | Files to include |
| exclude | Files to exclude |

## Requirements

- vite
- levelojs

## Resources

- Documentation: https://levelojs.motionmind.me
- Source Code: https://github.com/motionmin2007/Levelo-Js/tree/main/packages/vite-plugin-levelojs

## License

MIT