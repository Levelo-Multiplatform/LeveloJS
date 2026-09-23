use js_sys::{Array, Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

use levelo_wasm::WasmRenderer;

wasm_bindgen_test_configure!(run_in_browser);

fn operation(operation_type: &str) -> Object {
    let value = Object::new();

    Reflect::set(
        &value,
        &JsValue::from_str("type"),
        &JsValue::from_str(operation_type),
    )
    .unwrap();

    value
}

fn set_u64(object: &Object, field: &str, value: u64) {
    Reflect::set(
        object,
        &JsValue::from_str(field),
        &JsValue::from_f64(value as f64),
    )
    .unwrap();
}

fn set_string(object: &Object, field: &str, value: &str) {
    Reflect::set(
        object,
        &JsValue::from_str(field),
        &JsValue::from_str(value),
    )
    .unwrap();
}

#[wasm_bindgen_test]
fn wasm_renderer_tracks_nodes_across_batches() {
    let mut renderer = WasmRenderer::new();

    let first_batch = Array::new();

    let create_element = operation("CreateElement");
    set_u64(&create_element, "node", 1);
    set_string(&create_element, "elementType", "div");

    let create_text = operation("CreateText");
    set_u64(&create_text, "node", 2);
    set_string(&create_text, "text", "Hello");

    let append_child = operation("AppendChild");
    set_u64(&append_child, "parent", 1);
    set_u64(&append_child, "child", 2);

    first_batch.push(&create_element);
    first_batch.push(&create_text);
    first_batch.push(&append_child);

    renderer.execute_batch(first_batch).unwrap();

    assert_eq!(renderer.node_count(), 2);

    let second_batch = Array::new();

    let set_text = operation("SetText");
    set_u64(&set_text, "node", 2);
    set_string(&set_text, "text", "Updated");

    second_batch.push(&set_text);

    renderer.execute_batch(second_batch).unwrap();

    assert_eq!(renderer.node_count(), 2);
}

#[wasm_bindgen_test]
fn wasm_renderer_creates_and_deletes_nodes() {
    let mut renderer = WasmRenderer::new();

    let element = renderer.create_element("div".to_owned()).unwrap();
    let text = renderer.create_text("Hello".to_owned()).unwrap();

    assert_eq!(element, 1);
    assert_eq!(text, 2);
    assert_eq!(renderer.node_count(), 2);

    renderer.append_child(element, text).unwrap();
    renderer.remove_child(element, text).unwrap();
    renderer.delete_node(text).unwrap();

    assert_eq!(renderer.node_count(), 1);

    renderer.delete_node(element).unwrap();

    assert_eq!(renderer.node_count(), 0);
}

#[wasm_bindgen_test]
fn wasm_renderer_converts_properties_and_styles() {
    let mut renderer = WasmRenderer::new();

    let node = renderer.create_element("div".to_owned()).unwrap();

    renderer
        .set_property(node, "id".to_owned(), JsValue::from_str("app"))
        .unwrap();

    renderer
        .set_property(node, "disabled".to_owned(), JsValue::from_bool(true))
        .unwrap();

    renderer
        .set_property(node, "count".to_owned(), JsValue::from_f64(42.0))
        .unwrap();

    renderer
        .set_style(node, "display".to_owned(), "block".to_owned())
        .unwrap();

    renderer
        .set_style(node, "fontSize".to_owned(), "16px".to_owned())
        .unwrap();

    renderer.remove_style(node, "fontSize".to_owned()).unwrap();

    renderer.remove_property(node, "count".to_owned()).unwrap();

    assert_eq!(renderer.node_count(), 1);
}

#[wasm_bindgen_test]
fn wasm_renderer_converts_nested_values() {
    let mut renderer = WasmRenderer::new();

    let node = renderer.create_element("div".to_owned()).unwrap();

    let object = Object::new();

    Reflect::set(
        &object,
        &JsValue::from_str("title"),
        &JsValue::from_str("Hello"),
    )
    .unwrap();

    Reflect::set(
        &object,
        &JsValue::from_str("enabled"),
        &JsValue::from_bool(true),
    )
    .unwrap();

    let values = Array::new();

    values.push(&JsValue::from_str("one"));
    values.push(&JsValue::from_f64(2.0));
    values.push(&JsValue::from_bool(false));

    Reflect::set(&object, &JsValue::from_str("items"), &values).unwrap();

    renderer
        .set_property(node, "data".to_owned(), object.into())
        .unwrap();

    renderer
        .set_property(node, "empty".to_owned(), JsValue::NULL)
        .unwrap();

    renderer
        .set_property(node, "undefined".to_owned(), JsValue::UNDEFINED)
        .unwrap();

    assert_eq!(renderer.node_count(), 1);
}

#[wasm_bindgen_test]
fn wasm_renderer_rejects_invalid_operations() {
    let mut renderer = WasmRenderer::new();

    let unsupported = operation("UnknownOperation");

    let batch = Array::new();
    batch.push(&unsupported);

    let error = renderer.execute_batch(batch).unwrap_err();
    let message = error.as_string().unwrap();

    assert!(message.contains("Unsupported native operation"));
}

#[wasm_bindgen_test]
fn wasm_renderer_rejects_invalid_node_ids() {
    let mut renderer = WasmRenderer::new();

    let create_element = operation("CreateElement");

    Reflect::set(
        &create_element,
        &JsValue::from_str("node"),
        &JsValue::from_f64(0.0),
    )
    .unwrap();

    set_string(&create_element, "elementType", "div");

    let batch = Array::new();
    batch.push(&create_element);

    let error = renderer.execute_batch(batch).unwrap_err();
    let message = error.as_string().unwrap();

    assert!(message.contains("must be a positive integer"));
}

#[wasm_bindgen_test]
fn wasm_renderer_rejects_invalid_property_numbers() {
    let mut renderer = WasmRenderer::new();

    let node = renderer.create_element("div".to_owned()).unwrap();

    let result = renderer.set_property(node, "value".to_owned(), JsValue::from_f64(f64::NAN));

    let error = result.unwrap_err();
    let message = error.as_string().unwrap();

    assert!(message.contains("Property numbers must be finite."));
}

#[wasm_bindgen_test]
fn wasm_renderer_rejects_event_operations_at_core_boundary() {
    let mut renderer = WasmRenderer::new();

    let add_event = operation("AddEventListener");

    let batch = Array::new();
    batch.push(&add_event);

    let error = renderer.execute_batch(batch).unwrap_err();
    let message = error.as_string().unwrap();

    assert!(message.contains("Event operations must remain on the JavaScript platform layer."));
}

#[wasm_bindgen_test]
fn wasm_renderer_preserves_batch_order() {
    let mut renderer = WasmRenderer::new();

    let batch = Array::new();

    let create_parent = operation("CreateElement");
    set_u64(&create_parent, "node", 1);
    set_string(&create_parent, "elementType", "div");

    let create_child = operation("CreateElement");
    set_u64(&create_child, "node", 2);
    set_string(&create_child, "elementType", "span");

    let append_child = operation("AppendChild");
    set_u64(&append_child, "parent", 1);
    set_u64(&append_child, "child", 2);

    batch.push(&create_parent);
    batch.push(&create_child);
    batch.push(&append_child);

    renderer.execute_batch(batch).unwrap();

    assert_eq!(renderer.node_count(), 2);
}

// ---- New in Step 1: query and serialize methods ----

#[wasm_bindgen_test]
fn wasm_renderer_get_node_returns_full_snapshot() {
    let mut renderer = WasmRenderer::new();

    let batch = Array::new();

    let create = operation("CreateElement");
    set_u64(&create, "node", 1);
    set_string(&create, "elementType", "div");

    let set_prop = operation("SetProperty");
    set_u64(&set_prop, "node", 1);
    set_string(&set_prop, "name", "id");
    Reflect::set(
        &set_prop,
        &JsValue::from_str("value"),
        &JsValue::from_str("app"),
    )
    .unwrap();

    let set_style = operation("SetStyle");
    set_u64(&set_style, "node", 1);
    set_string(&set_style, "name", "color");
    set_string(&set_style, "value", "red");

    batch.push(&create);
    batch.push(&set_prop);
    batch.push(&set_style);

    renderer.execute_batch(batch).unwrap();

    let snapshot = renderer.get_node(1).unwrap();

    let id = Reflect::get(&snapshot, &JsValue::from_str("id")).unwrap();
    assert_eq!(id.as_f64(), Some(1.0));

    let kind = Reflect::get(&snapshot, &JsValue::from_str("kind")).unwrap();
    assert_eq!(kind.as_string().as_deref(), Some("element"));

    let parent = Reflect::get(&snapshot, &JsValue::from_str("parent")).unwrap();
    assert!(parent.is_null());

    let properties = Reflect::get(&snapshot, &JsValue::from_str("properties")).unwrap();
    let id_prop = Reflect::get(&properties, &JsValue::from_str("id")).unwrap();
    assert_eq!(id_prop.as_string().as_deref(), Some("app"));

    let styles = Reflect::get(&snapshot, &JsValue::from_str("styles")).unwrap();
    let color = Reflect::get(&styles, &JsValue::from_str("color")).unwrap();
    assert_eq!(color.as_string().as_deref(), Some("red"));
}

#[wasm_bindgen_test]
fn wasm_renderer_get_node_rejects_unknown_id() {
    let renderer = WasmRenderer::new();

    let result = renderer.get_node(999);

    assert!(result.is_err());
}

#[wasm_bindgen_test]
fn wasm_renderer_get_children_returns_ids_in_order() {
    let mut renderer = WasmRenderer::new();

    let batch = Array::new();

    let parent = operation("CreateElement");
    set_u64(&parent, "node", 1);
    set_string(&parent, "elementType", "div");

    let first = operation("CreateText");
    set_u64(&first, "node", 2);
    set_string(&first, "text", "a");

    let second = operation("CreateText");
    set_u64(&second, "node", 3);
    set_string(&second, "text", "b");

    let attach_first = operation("AppendChild");
    set_u64(&attach_first, "parent", 1);
    set_u64(&attach_first, "child", 2);

    let attach_second = operation("AppendChild");
    set_u64(&attach_second, "parent", 1);
    set_u64(&attach_second, "child", 3);

    batch.push(&parent);
    batch.push(&first);
    batch.push(&second);
    batch.push(&attach_first);
    batch.push(&attach_second);

    renderer.execute_batch(batch).unwrap();

    let children = renderer.get_children(1).unwrap();

    assert_eq!(children.length(), 2);
    assert_eq!(children.get(0).as_f64(), Some(2.0));
    assert_eq!(children.get(1).as_f64(), Some(3.0));
}

#[wasm_bindgen_test]
fn wasm_renderer_root_returns_first_parentless_node() {
    let mut renderer = WasmRenderer::new();

    assert_eq!(renderer.root(), 0);

    let batch = Array::new();

    let create = operation("CreateElement");
    set_u64(&create, "node", 5);
    set_string(&create, "elementType", "div");

    batch.push(&create);

    renderer.execute_batch(batch).unwrap();

    assert_eq!(renderer.root(), 5);
}

#[wasm_bindgen_test]
fn wasm_renderer_serialize_returns_full_tree() {
    let mut renderer = WasmRenderer::new();

    let batch = Array::new();

    let parent = operation("CreateElement");
    set_u64(&parent, "node", 1);
    set_string(&parent, "elementType", "div");

    let child = operation("CreateText");
    set_u64(&child, "node", 2);
    set_string(&child, "text", "hello");

    let attach = operation("AppendChild");
    set_u64(&attach, "parent", 1);
    set_u64(&attach, "child", 2);

    batch.push(&parent);
    batch.push(&child);
    batch.push(&attach);

    renderer.execute_batch(batch).unwrap();

    let snapshot = renderer.serialize().unwrap();

    let root = Reflect::get(&snapshot, &JsValue::from_str("root")).unwrap();
    assert_eq!(root.as_f64(), Some(1.0));

    let nodes = Reflect::get(&snapshot, &JsValue::from_str("nodes")).unwrap();
    let node_one = Reflect::get(&nodes, &JsValue::from_str("1")).unwrap();
    let node_two = Reflect::get(&nodes, &JsValue::from_str("2")).unwrap();

    assert!(!node_one.is_undefined());
    assert!(!node_two.is_undefined());

    let text = Reflect::get(&node_two, &JsValue::from_str("text")).unwrap();
    assert_eq!(text.as_string().as_deref(), Some("hello"));
}