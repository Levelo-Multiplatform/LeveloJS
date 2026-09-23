import {
  DefaultRenderer,
  InternalRenderNode,
  RenderTree,
  OperationType,
  h,
  state,
} from "../dist/index.js";

class RecordingAdapter {
  operations = [];

  execute(batch) {
    this.operations.push(...batch);
  }

  mount() {}

  unmount() {}

  dispose() {}

  clear() {
    this.operations.length = 0;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[Levelo] Assertion failed: ${message}`);
  }
}

function textNode(id, text) {
  const node = new InternalRenderNode(id, "#text");
  node.props.set("text", text);
  return node;
}

function element(id, type, text) {
  const node = new InternalRenderNode(id, type);

  if (text !== undefined) {
    node.appendChild(textNode(id + 1000, text));
  }

  return node;
}

function childTexts(node) {
  return node.children.map((child) => {
    if (child.type === "#text") {
      return String(child.props.get("text"));
    }

    const text = child.children.find(
      (grandchild) => grandchild.type === "#text",
    );

    return text
      ? String(text.props.get("text"))
      : child.type;
  });
}

function operationTypes(adapter) {
  return adapter.operations.map((operation) => operation.type);
}

function hasOperation(adapter, type) {
  return operationTypes(adapter).includes(type);
}

function assertOrder(root, expected, message) {
  const actual = childTexts(root);

  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
  );
}

async function main() {
  /*
   * 1. Static → empty dynamic → static
   *
   * The dynamic region starts empty. When it becomes populated, the new
   * node must be inserted between the surrounding static siblings.
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const [showDynamic, setShowDynamic] = state(false);

    const before = element(2, "span", "Before");
    const after = element(4, "span", "After");

    const dynamic = element(6, "span", "Dynamic");

    const root = h(
      "div",
      null,
      before,
      () => (showDynamic() ? dynamic : null),
      after,
    );

    renderer.render(new RenderTree(root));

    assertOrder(
      root,
      ["Before", "After"],
      "initial empty dynamic region should preserve static order",
    );

    adapter.clear();

    setShowDynamic(true);

    assertOrder(
      root,
      ["Before", "Dynamic", "After"],
      "dynamic node should be inserted between static siblings",
    );

    assert(
      hasOperation(adapter, OperationType.InsertBefore),
      "empty dynamic region should use targeted InsertBefore",
    );

    assert(
      !hasOperation(adapter, OperationType.ReplaceChild),
      "dynamic insertion should not use ReplaceChild",
    );

    renderer.dispose(new RenderTree(root));
  }

  /*
   * 2. Two initially-empty dynamic regions
   *
   * This is the regression case that motivated position + initialLength.
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const [firstVisible, setFirstVisible] = state(false);
    const [secondVisible, setSecondVisible] = state(false);

    const before = element(11, "span", "Before");
    const middle = element(13, "span", "Middle");
    const after = element(15, "span", "After");

    const first = element(17, "span", "First");
    const second = element(19, "span", "Second");

    const root = h(
      "div",
      null,
      before,
      () => (firstVisible() ? first : null),
      middle,
      () => (secondVisible() ? second : null),
      after,
    );

    renderer.render(new RenderTree(root));

    assertOrder(
      root,
      ["Before", "Middle", "After"],
      "two initially-empty dynamic regions should preserve static order",
    );

    adapter.clear();

    setFirstVisible(true);

    assertOrder(
      root,
      ["Before", "First", "Middle", "After"],
      "first dynamic region should insert at its original position",
    );

    adapter.clear();

    setSecondVisible(true);

    assertOrder(
      root,
      ["Before", "First", "Middle", "Second", "After"],
      "second dynamic region should account for the earlier dynamic insertion",
    );

    assert(
      hasOperation(adapter, OperationType.InsertBefore),
      "second dynamic insertion should use targeted InsertBefore",
    );

    renderer.dispose(new RenderTree(root));
  }

  /*
   * 3. Dynamic expression producing multiple nodes
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const [items, setItems] = state([]);

    const before = element(22, "span", "Before");
    const after = element(24, "span", "After");

    const first = element(26, "span", "One");
    const second = element(28, "span", "Two");

    const root = h(
      "div",
      null,
      before,
      () => items(),
      after,
    );

    renderer.render(new RenderTree(root));

    assertOrder(
      root,
      ["Before", "After"],
      "empty array dynamic region should produce no nodes",
    );

    adapter.clear();

    setItems([first, second]);

    assertOrder(
      root,
      ["Before", "One", "Two", "After"],
      "dynamic array should insert all nodes in order",
    );

    assert(
      hasOperation(adapter, OperationType.InsertBefore),
      "multiple dynamic nodes should be inserted with targeted operations",
    );

    renderer.dispose(new RenderTree(root));
  }

  /*
   * 4. Dynamic removal
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const dynamic = element(31, "span", "Dynamic");
    const [visible, setVisible] = state(true);

    const root = h(
      "div",
      null,
      element(32, "span", "Before"),
      () => (visible() ? dynamic : null),
      element(34, "span", "After"),
    );

    renderer.render(new RenderTree(root));

    assertOrder(
      root,
      ["Before", "Dynamic", "After"],
      "dynamic node should initially be mounted",
    );

    adapter.clear();

    setVisible(false);

    assertOrder(
      root,
      ["Before", "After"],
      "dynamic node should be removed without disturbing static siblings",
    );

    assert(
      hasOperation(adapter, OperationType.RemoveChild),
      "dynamic removal should use targeted RemoveChild",
    );

    renderer.dispose(new RenderTree(root));
  }

  /*
   * 5. Dynamic replacement
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const first = element(41, "span", "First");
    const second = element(43, "span", "Second");

    const [current, setCurrent] = state(first);

    const root = h(
      "div",
      null,
      element(44, "span", "Before"),
      () => current(),
      element(46, "span", "After"),
    );

    renderer.render(new RenderTree(root));

    assertOrder(
      root,
      ["Before", "First", "After"],
      "initial dynamic value should be mounted",
    );

    adapter.clear();

    setCurrent(second);

    assertOrder(
      root,
      ["Before", "Second", "After"],
      "dynamic replacement should preserve its position",
    );

    assert(
      hasOperation(adapter, OperationType.RemoveChild),
      "dynamic replacement should remove the previous node",
    );

    assert(
      hasOperation(adapter, OperationType.InsertBefore),
      "dynamic replacement should insert the new node at the same position",
    );

    renderer.dispose(new RenderTree(root));
  }

  /*
   * 6. Reactive text
   *
   * The reactive runtime should emit a targeted SetText operation.
   * The platform-neutral InternalRenderNode is not expected to mirror
   * the native text value after the operation is emitted.
   */
  {
    const adapter = new RecordingAdapter();
    const renderer = new DefaultRenderer(adapter);

    const [value, setValue] = state("Initial");

    const root = h(
      "div",
      null,
      () => value(),
    );

    renderer.render(new RenderTree(root));

    assert(
      childTexts(root)[0] === "Initial",
      "reactive text should have its initial value",
    );

    adapter.clear();

    setValue("Updated");

    const setTextOperation = adapter.operations.find(
      (operation) => operation.type === OperationType.SetText,
    );

    assert(
      Boolean(setTextOperation),
      "reactive text should emit targeted SetText",
    );

    assert(
      setTextOperation?.payload?.text === "Updated",
      "SetText should carry the updated value",
    );

    assert(
      !hasOperation(adapter, OperationType.CreateText),
      "reactive text update should not recreate the text node",
    );

    assert(
      !hasOperation(adapter, OperationType.CreateElement),
      "reactive text update should not recreate elements",
    );

    renderer.dispose(new RenderTree(root));
  }

  console.log("[Levelo] Renderer behavior integration passed.");
}

main().catch((error) => {
  console.error("[Levelo] Renderer behavior integration failed:", error);
  process.exitCode = 1;
});
