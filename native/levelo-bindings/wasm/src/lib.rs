use js_sys::{Array, Object, Reflect};
use wasm_bindgen::prelude::*;

use levelo_core::{
    operations::{Operation, OperationBatch},
    renderer::Renderer,
    tree::{Node, NodeId, NodeKind},
    value::Value,
};

/// WASM-facing wrapper around the shared Levelo renderer core.
///
/// This wrapper contains no DOM or platform logic. It only translates
/// JavaScript operations into the shared renderer representation, and
/// exposes the resulting tree back to JavaScript for inspection.
///
/// Node IDs are `u64` internally but cross the JS boundary as `f64`.
/// JavaScript's `Number` type is `f64`, node IDs never exceed 2^53 in
/// any realistic UI tree, and requiring callers to pass `BigInt` for
/// every node handle would make the API awkward for TypeScript users.
#[wasm_bindgen]
pub struct WasmRenderer {
    inner: Renderer,
}

#[wasm_bindgen]
impl WasmRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Renderer::new(),
        }
    }

    /// Executes an ordered batch of native renderer operations.
    ///
    /// The batch is translated into the shared Rust operation model and
    /// applied by the core renderer.
    pub fn execute_batch(&mut self, operations: Array) -> Result<(), JsValue> {
        let mut batch = OperationBatch::with_capacity(operations.length() as usize);

        for operation in operations.iter() {
            let operation = js_operation_to_core_operation(operation)?;
            batch.push(operation);
        }

        self.inner.apply_batch(&batch).map_err(core_error)
    }

    /// Creates an element node and returns its stable node ID.
    pub fn create_element(&mut self, element_type: String) -> Result<f64, JsValue> {
        let node = self.inner.allocate_node_id();

        self.inner
            .apply_operation(&Operation::CreateElement { node, element_type })
            .map_err(core_error)?;

        Ok(node.get() as f64)
    }

    /// Creates a text node and returns its stable node ID.
    pub fn create_text(&mut self, text: String) -> Result<f64, JsValue> {
        let node = self.inner.allocate_node_id();

        self.inner
            .apply_operation(&Operation::CreateText { node, text })
            .map_err(core_error)?;

        Ok(node.get() as f64)
    }

    /// Attaches an existing node to another node.
    pub fn append_child(&mut self, parent: f64, child: f64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::AppendChild {
                parent: NodeId::new(parent as u64),
                child: NodeId::new(child as u64),
            })
            .map_err(core_error)
    }

    /// Removes a child from its parent.
    pub fn remove_child(&mut self, parent: f64, child: f64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveChild {
                parent: NodeId::new(parent as u64),
                child: NodeId::new(child as u64),
            })
            .map_err(core_error)
    }

    /// Deletes a node from the renderer bookkeeping store.
    pub fn delete_node(&mut self, node: f64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::DeleteNode {
                node: NodeId::new(node as u64),
            })
            .map_err(core_error)
    }

    /// Sets a property using a real JavaScript value.
    pub fn set_property(
        &mut self,
        node: f64,
        name: String,
        value: JsValue,
    ) -> Result<(), JsValue> {
        let value = js_value_to_core_value(value)?;

        self.inner
            .apply_operation(&Operation::SetProperty {
                node: NodeId::new(node as u64),
                name,
                value,
            })
            .map_err(core_error)
    }

    /// Removes a property from a node.
    pub fn remove_property(&mut self, node: f64, name: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveProperty {
                node: NodeId::new(node as u64),
                name,
            })
            .map_err(core_error)
    }

    /// Sets a style value on a node.
    pub fn set_style(
        &mut self,
        node: f64,
        name: String,
        value: String,
    ) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::SetStyle {
                node: NodeId::new(node as u64),
                name,
                value,
            })
            .map_err(core_error)
    }

    /// Removes a style value from a node.
    pub fn remove_style(&mut self, node: f64, name: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveStyle {
                node: NodeId::new(node as u64),
                name,
            })
            .map_err(core_error)
    }

    /// Sets the text value of a node.
    pub fn set_text(&mut self, node: f64, text: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::SetText {
                node: NodeId::new(node as u64),
                text,
            })
            .map_err(core_error)
    }

    /// Returns the number of nodes currently tracked by the renderer.
    pub fn node_count(&self) -> usize {
        self.inner.node_count()
    }

    /// Returns a snapshot of a single node's state.
    ///
    /// The returned object has the shape:
    ///
    /// ```js
    /// {
    ///   id: number,
    ///   kind: "element" | "text",
    ///   parent: number | null,
    ///   children: number[],
    ///   properties: { [name: string]: unknown },
    ///   styles: { [name: string]: string },
    ///   text: string | null,
    /// }
    /// ```
    ///
    /// Throws if the node ID is not tracked.
    pub fn get_node(&self, node: f64) -> Result<JsValue, JsValue> {
        let node_id = node as u64;
        let id = NodeId::new(node_id);

        let target = self
            .inner
            .node(id)
            .ok_or_else(|| JsValue::from_str(&format!("[Levelo] unknown node {node_id}")))?;

        node_to_js_value(target)
    }

    /// Returns the child node IDs of a node as a JS array of numbers.
    pub fn get_children(&self, node: f64) -> Result<Array, JsValue> {
        let node_id = node as u64;
        let id = NodeId::new(node_id);

        let target = self
            .inner
            .node(id)
            .ok_or_else(|| JsValue::from_str(&format!("[Levelo] unknown node {node_id}")))?;

        let array = Array::new();

        for child in target.children() {
            array.push(&JsValue::from_f64(child.get() as f64));
        }

        Ok(array)
    }

    /// Returns the root node ID, or 0 if the tree is empty.
    ///
    /// The root is defined as any node with no parent. If multiple such
    /// nodes exist, the one with the lowest ID is returned.
    pub fn root(&self) -> f64 {
        let mut root: Option<NodeId> = None;

        for node in self.inner.nodes() {
            if node.parent().is_none() {
                match root {
                    Some(current) if current <= node.id() => {}
                    _ => root = Some(node.id()),
                }
            }
        }

        root.map(|id| id.get() as f64).unwrap_or(0.0)
    }

    /// Returns a snapshot of the entire render tree.
    ///
    /// The returned object has the shape:
    ///
    /// ```js
    /// {
    ///   root: number,
    ///   nodes: { [id: number]: { id, kind, parent, children, properties, styles, text } }
    /// }
    /// ```
    pub fn serialize(&self) -> Result<JsValue, JsValue> {
        let root = self.root();

        let nodes = Object::new();

        for node in self.inner.nodes() {
            let key = JsValue::from_str(&node.id().get().to_string());
            let value = node_to_js_value(node)?;

            Reflect::set(&nodes, &key, &value)?;
        }

        let result = Object::new();

        Reflect::set(&result, &JsValue::from_str("root"), &JsValue::from_f64(root))?;
        Reflect::set(&result, &JsValue::from_str("nodes"), &nodes)?;

        Ok(result.into())
    }
}

/// Serializes a single node into a JS object.
fn node_to_js_value(node: &Node) -> Result<JsValue, JsValue> {
    let object = Object::new();

    Reflect::set(
        &object,
        &JsValue::from_str("id"),
        &JsValue::from_f64(node.id().get() as f64),
    )?;

    let kind = match node.kind() {
        NodeKind::Element => "element",
        NodeKind::Text => "text",
    };

    Reflect::set(&object, &JsValue::from_str("kind"), &JsValue::from_str(kind))?;

    let parent = match node.parent() {
        Some(id) => JsValue::from_f64(id.get() as f64),
        None => JsValue::NULL,
    };

    Reflect::set(&object, &JsValue::from_str("parent"), &parent)?;

    let children = Array::new();
    for child in node.children() {
        children.push(&JsValue::from_f64(child.get() as f64));
    }
    Reflect::set(&object, &JsValue::from_str("children"), &children)?;

    let properties = Object::new();
    for (name, value) in node.properties() {
        let js_value = core_value_to_js_value(value)?;
        Reflect::set(&properties, &JsValue::from_str(name), &js_value)?;
    }
    Reflect::set(&object, &JsValue::from_str("properties"), &properties)?;

    let styles = Object::new();
    for (name, value) in node.styles() {
        Reflect::set(&styles, &JsValue::from_str(name), &JsValue::from_str(value))?;
    }
    Reflect::set(&object, &JsValue::from_str("styles"), &styles)?;

    let text = match node.text() {
        Some(value) => JsValue::from_str(value),
        None => JsValue::NULL,
    };
    Reflect::set(&object, &JsValue::from_str("text"), &text)?;

    Ok(object.into())
}

/// Converts a core value back into a JavaScript value.
fn core_value_to_js_value(value: &Value) -> Result<JsValue, JsValue> {
    match value {
        Value::Null => Ok(JsValue::NULL),
        Value::Bool(b) => Ok(JsValue::from_bool(*b)),
        Value::Number(n) => Ok(JsValue::from_f64(*n)),
        Value::String(s) => Ok(JsValue::from_str(s)),

        Value::Array(items) => {
            let array = Array::new();
            for item in items {
                array.push(&core_value_to_js_value(item)?);
            }
            Ok(array.into())
        }

        Value::Object(map) => {
            let object = Object::new();
            for (key, item) in map {
                let js_value = core_value_to_js_value(item)?;
                Reflect::set(&object, &JsValue::from_str(key), &js_value)?;
            }
            Ok(object.into())
        }
    }
}

/// Converts one platform-neutral JavaScript operation into a core operation.
fn js_operation_to_core_operation(value: JsValue) -> Result<Operation, JsValue> {
    let operation_type = Reflect::get(&value, &JsValue::from_str("type"))?
        .as_string()
        .ok_or_else(|| {
            JsValue::from_str("[Levelo] Native operation type must be a string.")
        })?;

    match operation_type.as_str() {
        "CreateElement" => {
            let node = required_u64(&value, "node")?;
            let element_type = required_string(&value, "elementType")?;

            Ok(Operation::CreateElement {
                node: NodeId::new(node),
                element_type,
            })
        }

        "CreateText" => {
            let node = required_u64(&value, "node")?;
            let text = required_string(&value, "text")?;

            Ok(Operation::CreateText {
                node: NodeId::new(node),
                text,
            })
        }

        "AppendChild" => {
            let parent = required_u64(&value, "parent")?;
            let child = required_u64(&value, "child")?;

            Ok(Operation::AppendChild {
                parent: NodeId::new(parent),
                child: NodeId::new(child),
            })
        }

        "InsertBefore" => {
            let parent = required_u64(&value, "parent")?;
            let child = required_u64(&value, "child")?;
            let reference = required_u64(&value, "reference")?;

            Ok(Operation::InsertBefore {
                parent: NodeId::new(parent),
                child: NodeId::new(child),
                reference: NodeId::new(reference),
            })
        }

        "ReplaceChild" => {
            let parent = required_u64(&value, "parent")?;
            let new_child = required_u64(&value, "newChild")?;
            let old_child = required_u64(&value, "oldChild")?;

            Ok(Operation::ReplaceChild {
                parent: NodeId::new(parent),
                new_child: NodeId::new(new_child),
                old_child: NodeId::new(old_child),
            })
        }

        "RemoveChild" => {
            let parent = required_u64(&value, "parent")?;
            let child = required_u64(&value, "child")?;

            Ok(Operation::RemoveChild {
                parent: NodeId::new(parent),
                child: NodeId::new(child),
            })
        }

        "DeleteNode" => {
            let node = required_u64(&value, "node")?;

            Ok(Operation::DeleteNode {
                node: NodeId::new(node),
            })
        }

        "SetProperty" => {
            let node = required_u64(&value, "node")?;
            let name = required_string(&value, "name")?;
            let raw_value = Reflect::get(&value, &JsValue::from_str("value"))?;
            let value = js_value_to_core_value(raw_value)?;

            Ok(Operation::SetProperty {
                node: NodeId::new(node),
                name,
                value,
            })
        }

        "RemoveProperty" => {
            let node = required_u64(&value, "node")?;
            let name = required_string(&value, "name")?;

            Ok(Operation::RemoveProperty {
                node: NodeId::new(node),
                name,
            })
        }

        "SetStyle" => {
            let node = required_u64(&value, "node")?;
            let name = required_string(&value, "name")?;
            let value = required_string(&value, "value")?;

            Ok(Operation::SetStyle {
                node: NodeId::new(node),
                name,
                value,
            })
        }

        "RemoveStyle" => {
            let node = required_u64(&value, "node")?;
            let name = required_string(&value, "name")?;

            Ok(Operation::RemoveStyle {
                node: NodeId::new(node),
                name,
            })
        }

        "SetText" => {
            let node = required_u64(&value, "node")?;
            let text = required_string(&value, "text")?;

            Ok(Operation::SetText {
                node: NodeId::new(node),
                text,
            })
        }
        "AddEventListener" | "RemoveEventListener" => Err(JsValue::from_str(
            "[Levelo] Event operations must remain on the JavaScript platform layer.",
        )),

        _ => Err(JsValue::from_str(&format!(
            "[Levelo] Unsupported native operation: {operation_type}"
        ))),
    }
}

fn required_string(value: &JsValue, field: &str) -> Result<String, JsValue> {
    Reflect::get(value, &JsValue::from_str(field))?
        .as_string()
        .ok_or_else(|| {
            JsValue::from_str(&format!(
                "[Levelo] Native operation field '{field}' must be a string."
            ))
        })
}

fn required_u64(value: &JsValue, field: &str) -> Result<u64, JsValue> {
    let value = Reflect::get(value, &JsValue::from_str(field))?;

    let number = value.as_f64().ok_or_else(|| {
        JsValue::from_str(&format!(
            "[Levelo] Native operation field '{field}' must be a number."
        ))
    })?;

    if !number.is_finite() || number < 1.0 || number.fract() != 0.0 {
        return Err(JsValue::from_str(&format!(
            "[Levelo] Native operation field '{field}' must be a positive integer."
        )));
    }

    if number > u64::MAX as f64 {
        return Err(JsValue::from_str(&format!(
            "[Levelo] Native operation field '{field}' is too large."
        )));
    }

    Ok(number as u64)
}

/// Converts a JavaScript value into the shared core value representation.
fn js_value_to_core_value(value: JsValue) -> Result<Value, JsValue> {
    if value.is_null() || value.is_undefined() {
        return Ok(Value::Null);
    }

    if let Some(boolean) = value.as_bool() {
        return Ok(Value::Bool(boolean));
    }

    if let Some(number) = value.as_f64() {
        if !number.is_finite() {
            return Err(JsValue::from_str(
                "[Levelo] Property numbers must be finite.",
            ));
        }

        return Ok(Value::Number(number));
    }

    if let Some(string) = value.as_string() {
        return Ok(Value::String(string));
    }

    if Array::is_array(&value) {
        let array = Array::from(&value);
        let mut values = Vec::with_capacity(array.length() as usize);

        for item in array.iter() {
            values.push(js_value_to_core_value(item)?);
        }

        return Ok(Value::Array(values));
    }

    if value.is_object() {
        let object = Object::from(value);
        let keys = Object::keys(&object);
        let mut properties = std::collections::HashMap::new();

        for key in keys.iter() {
            let key = key.as_string().ok_or_else(|| {
                JsValue::from_str("[Levelo] Object keys must be strings.")
            })?;

            let nested_value = Reflect::get(&object, &JsValue::from_str(&key))?;

            properties.insert(key, js_value_to_core_value(nested_value)?);
        }

        return Ok(Value::Object(properties));
    }

    Err(JsValue::from_str(
        "[Levelo] Unsupported JavaScript property value.",
    ))
}

/// Converts a core error into a JavaScript error value.
fn core_error(error: levelo_core::error::CoreError) -> JsValue {
    JsValue::from_str(&error.to_string())
}

/// Returns the version of the shared Levelo native core.
#[wasm_bindgen]
pub fn version() -> String {
    levelo_core::version().to_owned()
}