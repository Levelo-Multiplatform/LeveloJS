//! Shared, platform-neutral renderer state.
//!
//! The renderer owns node identity, structural relationships, and
//! platform-neutral render state. Platform executors consume the same
//! targeted operations and translate them into native platform calls.

use crate::{
    error::CoreError,
    operations::{Operation, OperationBatch},
    tree::{Node, NodeId, NodeKind, NodeStore},
};

/// Executes committed renderer operations on a platform.
///
/// The core crate does not know whether the executor targets the DOM,
/// Android views, Windows controls, or another native surface.
pub trait PlatformExecutor {
    type Error;

    fn execute(&mut self, batch: &OperationBatch) -> Result<(), Self::Error>;
}

/// Shared renderer state owned by the Levelo core.
#[derive(Debug, Default)]
pub struct Renderer {
    nodes: NodeStore,
    next_node_id: u64,
}

impl Renderer {
    /// Creates an empty renderer with node IDs starting at one.
    pub fn new() -> Self {
        Self {
            nodes: NodeStore::new(),
            next_node_id: 1,
        }
    }

    /// Allocates a stable node ID.
    pub fn allocate_node_id(&mut self) -> NodeId {
        let id = NodeId::new(self.next_node_id);

        self.next_node_id = self.next_node_id.saturating_add(1);

        id
    }

    /// Creates a node using an internally allocated ID.
    pub fn create_node(&mut self, kind: NodeKind) -> Result<NodeId, CoreError> {
        let id = self.allocate_node_id();

        self.nodes.insert(Node::new(id, kind))?;

        Ok(id)
    }

    /// Returns a node from the renderer's bookkeeping store.
    pub fn node(&self, id: NodeId) -> Option<&Node> {
        self.nodes.get(id)
    }

    /// Applies one targeted operation to shared renderer state.
    ///
    /// The renderer never performs platform work directly. It only updates
    /// state that is meaningful across supported platforms.
    pub fn apply_operation(&mut self, operation: &Operation) -> Result<(), CoreError> {
        match operation {
            Operation::CreateElement {
                node,
                element_type: _,
            } => {
                self.register_external_node(*node, NodeKind::Element)?;
            }

            Operation::CreateText { node, text } => {
                self.register_external_node(*node, NodeKind::Text)?;

                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.set_text(text.clone());
            }

            Operation::AppendChild { parent, child } => {
                self.nodes.attach_child(*parent, *child)?;
            }

            Operation::InsertBefore {
                parent,
                child,
                reference,
            } => {
                self.nodes.insert_before(*parent, *child, *reference)?;
            }

            Operation::ReplaceChild {
                parent,
                new_child,
                old_child,
            } => {
                self.nodes.replace_child(*parent, *new_child, *old_child)?;
            }

            Operation::RemoveChild { parent, child } => {
                self.nodes.detach_child(*parent, *child)?;
            }

            Operation::DeleteNode { node } => {
                self.delete_node(*node)?;
            }

            Operation::SetProperty { node, name, value } => {
                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.set_property(name.clone(), value.clone());
            }

            Operation::RemoveProperty { node, name } => {
                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.remove_property(name);
            }

            Operation::SetStyle { node, name, value } => {
                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.set_style(name.clone(), value.clone());
            }

            Operation::RemoveStyle { node, name } => {
                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.remove_style(name);
            }

            Operation::SetText { node, text } => {
                let target = self
                    .nodes
                    .get_mut(*node)
                    .ok_or_else(|| CoreError::UnknownNode(node.get()))?;

                target.set_text(text.clone());
            }

            Operation::AddEventListener { .. } | Operation::RemoveEventListener { .. } => {
                // Event handlers remain platform-runtime state.
            }
        }

        Ok(())
    }

    /// Applies an ordered batch of targeted operations.
    pub fn apply_batch(&mut self, batch: &OperationBatch) -> Result<(), CoreError> {
        for operation in batch.iter() {
            self.apply_operation(operation)?;
        }

        Ok(())
    }

    /// Executes a batch on the platform and then commits it to shared state
    /// Platform execution is the commit boundary. Shared renderer state is only
    /// updated after the platform accepts the complete batch.
    pub fn commit<E>(
        &mut self,
        batch: &OperationBatch,
        executor: &mut E,
    ) -> Result<(), CommitError<E::Error>>
    where
        E: PlatformExecutor,
    {
        executor.execute(batch).map_err(CommitError::Platform)?;

        self.apply_batch(batch).map_err(CommitError::Core)?;

        Ok(())
    }

    /// Builds a batch containing one targeted operation.
    pub fn single_operation(&self, operation: Operation) -> OperationBatch {
        let mut batch = OperationBatch::with_capacity(1);

        batch.push(operation);

        batch
    }

    /// Returns the number of nodes currently tracked by the renderer.
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Iterates over every node currently held by the renderer.
    pub fn nodes(&self) -> impl Iterator<Item = &Node> {
        self.nodes.iter()
    }

    /// Registers a node whose ID was allocated outside the Rust renderer.
    ///
    /// The allocator is advanced beyond externally supplied IDs to prevent
    /// future Rust allocations from colliding with them.
    fn register_external_node(&mut self, id: NodeId, kind: NodeKind) -> Result<(), CoreError> {
        self.nodes.insert(Node::new(id, kind))?;

        let next_id = id.get().saturating_add(1);

        if next_id > self.next_node_id {
            self.next_node_id = next_id;
        }

        Ok(())
    }

    fn delete_node(&mut self, node: NodeId) -> Result<(), CoreError> {
        if self.nodes.remove(node).is_none() {
            return Err(CoreError::UnknownNode(node.get()));
        }

        Ok(())
    }
}

/// Errors that can occur while committing an operation batch.
#[derive(Debug)]
pub enum CommitError<E> {
    Core(CoreError),
    Platform(E),
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::operations::{Operation, OperationBatch};
    use crate::tree::NodeId;

    #[derive(Debug)]
    struct TestExecutor {
        should_fail: bool,
        executed: usize,
    }

    impl PlatformExecutor for TestExecutor {
        type Error = &'static str;

        fn execute(&mut self, batch: &OperationBatch) -> Result<(), Self::Error> {
            if self.should_fail {
                return Err("platform execution failed");
            }

            self.executed += batch.len();
            Ok(())
        }
    }

    #[test]
    fn commit_updates_core_state_after_platform_success() {
        let mut renderer = Renderer::new();

        let mut batch = OperationBatch::new();
        batch.push(Operation::CreateElement {
            node: NodeId::new(1),
            element_type: "div".into(),
        });

        let mut executor = TestExecutor {
            should_fail: false,
            executed: 0,
        };

        renderer.commit(&batch, &mut executor).unwrap();

        assert_eq!(executor.executed, 1);
        assert_eq!(renderer.node_count(), 1);
    }

    #[test]
    fn commit_does_not_update_core_state_when_platform_fails() {
        let mut renderer = Renderer::new();

        let mut batch = OperationBatch::new();
        batch.push(Operation::CreateElement {
            node: NodeId::new(1),
            element_type: "div".into(),
        });

        let mut executor = TestExecutor {
            should_fail: true,
            executed: 0,
        };

        let error = renderer.commit(&batch, &mut executor).unwrap_err();

        assert!(matches!(error, CommitError::Platform("platform execution failed")));
        assert_eq!(renderer.node_count(), 0);
    }
}