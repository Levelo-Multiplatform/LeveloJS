import { render } from "levelojs";
import { App } from "./App";
import { RouterDemo } from "./router-demo";
import "./style.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app element.");
}

const isRouterDemo = window.location.pathname.startsWith("/router");

render(isRouterDemo ? RouterDemo : App, root);

console.log(
  isRouterDemo
    ? "[Levelo Test] Router demo mounted."
    : "[Levelo Test] Element zoo mounted.",
);