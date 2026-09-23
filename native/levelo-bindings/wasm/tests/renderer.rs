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
        .set_property(
            node,
            "id".to_owned(),
            JsValue::from_str("app"),
        )
        .unwrap();

    renderer
        .set_property(
            node,
            "disabled".to_owned(),
            JsValue::from_bool(true),
        )
        .unwrap();

    renderer
        .set_property(
            node,
            "count".to_owned(),
            JsValue::from_f64(42.0),
        )
        .unwrap();

    renderer
        .set_style(
            node,
            "display".to_owned(),
            "block".to_owned(),
        )
        .unwrap();

    renderer
        .set_style(
            node,
            "fontSize".to_owned(),
            "16px".to_owned(),
        )
        .unwrap();

    renderer
        .remove_style(node, "fontSize".to_owned())
        .unwrap();

    renderer
        .remove_property(node, "count".to_owned())
        .unwrap();

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

    Reflect::set(
        &object,
        &JsValue::from_str("items"),
        &values,
    )
    .unwrap();

    renderer
        .set_property(
            node,
            "data".to_owned(),
            object.into(),
        )
        .unwrap();

    renderer
        .set_property(
            node,
            "empty".to_owned(),
            JsValue::NULL,
        )
        .unwrap();

    renderer
        .set_property(
            node,
            "undefined".to_owned(),
            JsValue::UNDEFINED,
        )
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

    let result = renderer.set_property(
        node,
        "value".to_owned(),
        JsValue::from_f64(f64::NAN),
    );

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
