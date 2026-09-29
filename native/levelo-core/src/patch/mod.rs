//! Platform-neutral DOM patches emitted by the renderer.
//!
//! A `DomPatch` describes one concrete change that a platform adapter should
//! apply to its native surface. Patches are emitted in order by
//! `Renderer::apply_batch` and are consumed sequentially by the adapter.
//!
//! The core does not apply patches itself. It only produces them. The Web
//! adapter, the Android adapter, and the Windows adapter each interpret the
//! same patch sequence against their own platform.

use crate::tree::NodeId;
use crate::value::Value;

/// One concrete change for a platform adapter to apply.
///
/// Patches are ordered. A patch that creates a node always precedes any
/// patch that references it. A patch that removes a node always follows any
/// patch that unparented it.
#[derive(Debug, Clone, PartialEq)]
pub enum DomPatch {
    /// Create a native element node with the given tag.
    CreateElement { node: NodeId, tag: String },

    /// Create a native text node with the given text.
    CreateText { node: NodeId, text: String },

    /// Set a property on an element.
    SetProperty {
        node: NodeId,
        name: String,
        value: Value,
    },

    /// Remove a property from an element.
    RemoveProperty { node: NodeId, name: String },

    /// Set a style value on an element.
    SetStyle {
        node: NodeId,
        name: String,
        value: String,
    },

    /// Remove a style value from an element.
    RemoveStyle { node: NodeId, name: String },

    /// Set the text content of a text node.
    SetText { node: NodeId, text: String },

    /// Append a child to a parent. The child must not already be attached
    /// to the parent.
    AppendChild { parent: NodeId, child: NodeId },

    /// Insert a child before a reference node under a parent.
    InsertBefore {
        parent: NodeId,
        child: NodeId,
        reference: NodeId,
    },

    /// Detach a child from a parent. The child remains alive in the store.
    RemoveChild { parent: NodeId, child: NodeId },

    /// Replace one child with another under a parent.
    ReplaceChild {
        parent: NodeId,
        new_child: NodeId,
        old_child: NodeId,
    },

    /// Fully remove a node from the renderer's bookkeeping.
    DeleteNode { node: NodeId },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_element_patch() {
        let patch = DomPatch::CreateElement {
            node: NodeId::new(1),
            tag: "div".into(),
        };

        match patch {
            DomPatch::CreateElement { node, tag } => {
                assert_eq!(node.get(), 1);
                assert_eq!(tag, "div");
            }
            _ => panic!("expected CreateElement"),
        }
    }

    #[test]
    fn patches_are_comparable() {
        let a = DomPatch::SetText {
            node: NodeId::new(1),
            text: "hello".into(),
        };

        let b = DomPatch::SetText {
            node: NodeId::new(1),
            text: "hello".into(),
        };

        assert_eq!(a, b);
    }

    #[test]
    fn patches_carry_values() {
        let patch = DomPatch::SetProperty {
            node: NodeId::new(1),
            name: "count".into(),
            value: Value::Number(42.0),
        };

        match patch {
            DomPatch::SetProperty { value, .. } => {
                assert_eq!(value.as_number(), Some(42.0));
            }
            _ => panic!("expected SetProperty"),
        }
    }
}