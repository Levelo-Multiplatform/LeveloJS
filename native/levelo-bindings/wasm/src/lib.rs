use js_sys::{Array, Object, Reflect};
use wasm_bindgen::prelude::*;

use levelo_core::{
    operations::{Operation, OperationBatch},
    renderer::Renderer,
    tree::NodeId,
    value::Value,
};

/// WASM-facing wrapper around the shared Levelo renderer core.
///
/// This wrapper contains no DOM or platform logic. It only translates
/// JavaScript operations into the shared renderer representation.
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
    pub fn create_element(&mut self, element_type: String) -> Result<u64, JsValue> {
        let node = self.inner.allocate_node_id();

        self.inner
            .apply_operation(&Operation::CreateElement { node, element_type })
            .map_err(core_error)?;

        Ok(node.get())
    }

    /// Creates a text node and returns its stable node ID.
    pub fn create_text(&mut self, text: String) -> Result<u64, JsValue> {
        let node = self.inner.allocate_node_id();

        self.inner
            .apply_operation(&Operation::CreateText { node, text })
            .map_err(core_error)?;

        Ok(node.get())
    }

    /// Attaches an existing node to another node.
    pub fn append_child(&mut self, parent: u64, child: u64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::AppendChild {
                parent: NodeId::new(parent),
                child: NodeId::new(child),
            })
            .map_err(core_error)
    }

    /// Removes a child from its parent.
    pub fn remove_child(&mut self, parent: u64, child: u64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveChild {
                parent: NodeId::new(parent),
                child: NodeId::new(child),
            })
            .map_err(core_error)
    }

    /// Deletes a node from the renderer bookkeeping store.
    pub fn delete_node(&mut self, node: u64) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::DeleteNode {
                node: NodeId::new(node),
            })
            .map_err(core_error)
    }

    /// Sets a property using a real JavaScript value.
    pub fn set_property(
        &mut self,
        node: u64,
        name: String,
        value: JsValue,
    ) -> Result<(), JsValue> {
        let value = js_value_to_core_value(value)?;

        self.inner
            .apply_operation(&Operation::SetProperty {
                node: NodeId::new(node),
                name,
                value,
            })
            .map_err(core_error)
    }

    /// Removes a property from a node.
    pub fn remove_property(&mut self, node: u64, name: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveProperty {
                node: NodeId::new(node),
                name,
            })
            .map_err(core_error)
    }

    /// Sets a style value on a node.
    pub fn set_style(
        &mut self,
        node: u64,
        name: String,
        value: String,
    ) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::SetStyle {
                node: NodeId::new(node),
                name,
                value,
            })
            .map_err(core_error)
    }

    /// Removes a style value from a node.
    pub fn remove_style(&mut self, node: u64, name: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::RemoveStyle {
                node: NodeId::new(node),
                name,
            })
            .map_err(core_error)
    }

    /// Sets the text value of a node.
    pub fn set_text(&mut self, node: u64, text: String) -> Result<(), JsValue> {
        self.inner
            .apply_operation(&Operation::SetText {
                node: NodeId::new(node),
                text,
            })
            .map_err(core_error)
    }

    /// Returns the number of nodes currently tracked by the renderer.
    pub fn node_count(&self) -> usize {
        self.inner.node_count()
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
