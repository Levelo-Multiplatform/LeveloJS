import { h, render, state } from "levelojs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[Levelo Renderer] ${message}`);
  console.log(`✓ ${message}`);
}

const root = document.getElementById("app");
if (!root) throw new Error("[Levelo Renderer] Missing #app container.");

const [step, setStep] = state(0);
let componentRuns = 0;
let clicks = 0;

function TestApp() {
  componentRuns++;

  return (
    <main
      id="renderer-root"
      title={step() === 0 ? "initial" : undefined}
      style={{
        padding: step() === 0 ? "4px" : "8px",
        display: step() === 0 ? "block" : undefined,
      }}
    >
      <h1>{step() === 0 ? "Initial" : "Updated"}</h1>
      <p id="message">
        {step() === 0 ? "Initial paragraph" : "Updated paragraph"}
      </p>
      <button
        id="test-button"
        onClick={() => clicks++}
      >
        Click
      </button>
      {step() === 0
        ? h("section", { id: "old-node" }, "Old node")
        : h("article", { id: "new-node" }, "New node")}
    </main>
  );
}

render(TestApp, root);

const getRoot = () => document.getElementById("renderer-root") as HTMLElement;
const getButton = () => document.getElementById("test-button") as HTMLButtonElement;

assert(componentRuns === 1, "Component executes once during initial mount");
assert(getRoot().querySelector("h1")?.textContent === "Initial", "Initial render");
assert(document.getElementById("message")?.textContent === "Initial paragraph", "Initial text");
assert(getRoot().getAttribute("title") === "initial", "Initial property");
assert(getRoot().style.padding === "4px", "Initial style");
assert(document.getElementById("old-node") !== null, "Initial dynamic child");

getButton().click();
assert(clicks === 1, "Event listener execution");

setStep(1);

assert(componentRuns === 1, "Signal update does not rerun the component");
assert(getRoot().querySelector("h1")?.textContent === "Updated", "Fine-grained text update");
assert(document.getElementById("message")?.textContent === "Updated paragraph", "Fine-grained paragraph update");
assert(getRoot().getAttribute("title") === null, "Fine-grained property removal");
assert(getRoot().style.padding === "8px", "Fine-grained style update");
assert(getRoot().style.display === "", "Fine-grained style removal");
assert(document.getElementById("old-node") === null, "Direct dynamic child removal");
assert(document.getElementById("new-node")?.tagName === "ARTICLE", "Direct dynamic child replacement");

document.body.setAttribute("data-renderer-tests", "passed");
console.log("[Levelo Renderer] Fine-grained DDOM assertions passed.");
