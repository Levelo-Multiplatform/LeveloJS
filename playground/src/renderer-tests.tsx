import { h, render, state } from "levelojs";
import { NodeFactory, RenderTree, DefaultRenderer, DefaultSnapshotBuilder, DefaultNodeDiffer, DefaultTreeDiffer, CommitCoordinator, DefaultRenderPipeline, ValidationStage, CommitStage, ImmediateScheduler } from "levelojs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[Levelo Renderer] ${message}`);
  console.log(`✓ ${message}`);
}

const root = document.getElementById("app");
if (!root) throw new Error("[Levelo Renderer] Missing #app container.");

let setStep!: (value: number) => void;
const [step, setStepState] = state(0);
setStep = setStepState;

let clicks = 0;
const handleClick = () => clicks++;

function TestApp() {
  const current = step();

  return h(
    "main",
    { id: "renderer-root", title: current === 0 ? "initial" : undefined },
    h("h1", null, current === 0 ? "Initial" : "Updated"),
    h(
      "p",
      { id: "message" },
      current === 0 ? "Initial paragraph" : "Updated paragraph",
    ),
    h(
      "button",
      {
        id: "test-button",
        title: current === 0 ? "button" : undefined,
        style: {
          padding: current === 0 ? "4px" : "8px",
          display: current === 0 ? "block" : undefined,
        },
        onClick: handleClick,
      },
      "Click",
    ),
    current === 0
      ? h("section", { id: "old-node" }, "Old node")
      : h("article", { id: "new-node" }, "New node"),
  );
}

render(TestApp, root);

const getRoot = () => document.getElementById("renderer-root") as HTMLElement;
const getButton = () => document.getElementById("test-button") as HTMLButtonElement;

assert(getRoot().querySelector("h1")?.textContent === "Initial", "Initial render");
assert(document.getElementById("message")?.textContent === "Initial paragraph", "Initial text node");
assert(getRoot().getAttribute("title") === "initial", "Initial property");
assert(getButton().style.padding === "4px", "Initial style");
assert(document.getElementById("old-node") !== null, "Initial child tree");

getButton().click();
assert(clicks === 1, "Event listener execution");

setStep(1);

assert(getRoot().querySelector("h1")?.textContent === "Updated", "Text update");
assert(document.getElementById("message")?.textContent === "Updated paragraph", "Paragraph update");
assert(getRoot().getAttribute("title") === null, "Property removal");
assert(getButton().style.padding === "8px", "Style update");
assert(getButton().style.display === "", "Style removal");
assert(document.getElementById("old-node") === null, "Old child removal");
assert(document.getElementById("new-node")?.tagName === "ARTICLE", "Child replacement");

const list = h(
  "div",
  { id: "order-test" },
  h("span", { id: "a" }, "A"),
  h("span", { id: "b" }, "B"),
  h("span", { id: "c" }, "C"),
);

const listHost = document.createElement("div");
listHost.id = "secondary-test-host";
document.body.appendChild(listHost);
render(list, listHost);

const order = Array.from(listHost.querySelectorAll("span")).map((node) => node.id);
assert(order.join(",") === "a,b,c", "Secondary renderer mount");

console.log("[Levelo Renderer] All browser assertions passed.");


// Direct renderer-contract test with stable logical node IDs exercises Move/InsertBefore.
const factory = new NodeFactory();
const adapter = {
  batches: [] as any[],
  execute(batch: any) { this.batches.push(batch); },
  mount() {},
  unmount() {},
};
const renderer = new DefaultRenderer(
  adapter,
  new DefaultSnapshotBuilder(),
  new DefaultTreeDiffer(new DefaultNodeDiffer()),
  new DefaultRenderPipeline([new ValidationStage(), new CommitStage(new CommitCoordinator())]),
  new ImmediateScheduler(),
);

const parent = factory.createElement(100, "div");
const a = factory.createElement(101, "span");
const b = factory.createElement(102, "span");
const c = factory.createElement(103, "span");
a.props.set("id", "a");
b.props.set("id", "b");
c.props.set("id", "c");
parent.appendChild(a);
parent.appendChild(b);
parent.appendChild(c);
renderer.render(new RenderTree(parent));

const movedParent = factory.createElement(100, "div");
const movedC = factory.createElement(103, "span");
const movedA = factory.createElement(101, "span");
const movedB = factory.createElement(102, "span");
movedC.props.set("id", "c");
movedA.props.set("id", "a");
movedB.props.set("id", "b");
movedParent.appendChild(movedC);
movedParent.appendChild(movedA);
movedParent.appendChild(movedB);
renderer.render(new RenderTree(movedParent));

const moveBatch = adapter.batches[1];
assert(
  moveBatch.operations.some((operation: any) => operation.type === 3),
  "Move operation generation",
);

console.log("[Levelo Renderer] Stable-ID reconciliation assertions passed.");
