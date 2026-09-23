import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const source = resolve(
  here,
  "../../../native/levelo-bindings/wasm/pkg",
);

const target = resolve(here, "../dist/wasm");

mkdirSync(target, { recursive: true });

let copied = 0;

for (const file of readdirSync(source)) {
  // wasm-pack emits a .gitignore in pkg/ that contains "*". npm refuses to
  // publish files inside a directory with a .gitignore, so the WASM artifacts
  // would be silently excluded from the tarball. Skip it, and remove any
  // stale copy from a previous run.
  if (file === ".gitignore") {
    const stale = join(target, ".gitignore");
    if (existsSync(stale)) unlinkSync(stale);
    continue;
  }

  const from = join(source, file);
  const to = join(target, file);

  if (statSync(from).isFile()) {
    copyFileSync(from, to);
    copied++;
  }
}

console.log(`[levelojs] Copied ${copied} WASM files into dist/wasm/`);