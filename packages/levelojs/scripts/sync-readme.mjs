import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rootReadme = resolve(here, "../../../README.md");
const packageReadme = resolve(here, "../README.md");

writeFileSync(packageReadme, readFileSync(rootReadme));
console.log("Synced package README from project root.");