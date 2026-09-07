# Levelo Web Renderer Release

Packages included:

- `levelojs-2.2.0.tgz` - Levelo runtime and web renderer.
- `vite-plugin-levelojs-1.0.0.tgz` - JSX/TSX compiler plugin for Vite.

The public application API is intentionally small:

```tsx
import { render } from "levelojs";

function App() {
  return <div>Hello Levelo</div>;
}

render(App, document.getElementById("app"));
```

The renderer internals remain behind that API.
