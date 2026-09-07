import { render } from "levelojs";
import Mind from "./Mind";
import "./index.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error('[Levelo Test] Missing #app container.');
}

render(
  Mind,
  root,
);

console.log("[Levelo Test] Web renderer mounted successfully.");
