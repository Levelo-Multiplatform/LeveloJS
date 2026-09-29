//! Platform-neutral instructions produced by the renderer.
//!
//! These operations describe *what* should happen. They do not contain DOM,
//! Android, Windows, or any other platform implementation details.

use crate::tree::NodeId;
use crate::value::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OperationType {
    CreateElement,
    CreateText,
    AppendChild,
    InsertBefore,
    ReplaceChild,
    RemoveChild,
    DeleteNode,
    SetProperty,
    RemoveProperty,
    SetStyle,
    RemoveStyle,
    SetText,
    AddEventListener,
    RemoveEventListener,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Operation {
    CreateElement {
        node: NodeId,
        element_type: String,
    },
    CreateText {
        node: NodeId,
        text: String,
    },
    AppendChild {
        parent: NodeId,
        child: NodeId,
    },
    InsertBefore {
        parent: NodeId,
        child: NodeId,
        reference: NodeId,
    },
    ReplaceChild {
        parent: NodeId,
        new_child: NodeId,
        old_child: NodeId,
    },
    RemoveChild {
        parent: NodeId,
        child: NodeId,
    },
    DeleteNode {
        node: NodeId,
    },
    SetProperty {
        node: NodeId,
        name: String,
        value: Value,
    },
    RemoveProperty {
        node: NodeId,
        name: String,
    },
    SetStyle {
        node: NodeId,
        name: String,
        value: String,
    },
    RemoveStyle {
        node: NodeId,
        name: String,
    },
    SetText {
        node: NodeId,
        text: String,
    },
    AddEventListener {
        node: NodeId,
        event: String,
        listener_id: u64,
    },
    RemoveEventListener {
        node: NodeId,
        event: String,
        listener_id: u64,
    },
}

impl Operation {
    pub fn kind(&self) -> OperationType {
        match self {
            Self::CreateElement { .. } => OperationType::CreateElement,
            Self::CreateText { .. } => OperationType::CreateText,
            Self::AppendChild { .. } => OperationType::AppendChild,
            Self::InsertBefore { .. } => OperationType::InsertBefore,
            Self::ReplaceChild { .. } => OperationType::ReplaceChild,
            Self::RemoveChild { .. } => OperationType::RemoveChild,
            Self::DeleteNode { .. } => OperationType::DeleteNode,
            Self::SetProperty { .. } => OperationType::SetProperty,
            Self::RemoveProperty { .. } => OperationType::RemoveProperty,
            Self::SetStyle { .. } => OperationType::SetStyle,
            Self::RemoveStyle { .. } => OperationType::RemoveStyle,
            Self::SetText { .. } => OperationType::SetText,
            Self::AddEventListener { .. } => OperationType::AddEventListener,
            Self::RemoveEventListener { .. } => OperationType::RemoveEventListener,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct OperationBatch {
    operations: Vec<Operation>,
}

impl OperationBatch {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            operations: Vec::with_capacity(capacity),
        }
    }

    pub fn push(&mut self, operation: Operation) {
        self.operations.push(operation);
    }

    pub fn len(&self) -> usize {
        self.operations.len()
    }

    pub fn is_empty(&self) -> bool {
        self.operations.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = &Operation> {
        self.operations.iter()
    }

    pub fn into_operations(self) -> Vec<Operation> {
        self.operations
    }

    pub fn clear(&mut self) {
        self.operations.clear();
    }
}

impl IntoIterator for OperationBatch {
    type Item = Operation;
    type IntoIter = std::vec::IntoIter<Operation>;

    fn into_iter(self) -> Self::IntoIter {
        self.operations.into_iter()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_operation_kind() {
        let operation = Operation::SetText {
            node: NodeId::new(7),
            text: "Hello".into(),
        };

        assert_eq!(operation.kind(), OperationType::SetText);
    }

    #[test]
    fn reports_insert_before_operation_kind() {
        let operation = Operation::InsertBefore {
            parent: NodeId::new(1),
            child: NodeId::new(2),
            reference: NodeId::new(3),
        };

        assert_eq!(operation.kind(), OperationType::InsertBefore);
    }

    #[test]
    fn reports_replace_child_operation_kind() {
        let operation = Operation::ReplaceChild {
            parent: NodeId::new(1),
            new_child: NodeId::new(2),
            old_child: NodeId::new(3),
        };

        assert_eq!(operation.kind(), OperationType::ReplaceChild);
    }

    #[test]
    fn batch_preserves_order() {
        let mut batch = OperationBatch::new();

        batch.push(Operation::SetText {
            node: NodeId::new(1),
            text: "first".into(),
        });
        batch.push(Operation::SetText {
            node: NodeId::new(1),
            text: "second".into(),
        });

        let operations = batch.into_operations();

        assert_eq!(operations.len(), 2);
        assert!(matches!(operations[0], Operation::SetText { .. }));
    }
}
