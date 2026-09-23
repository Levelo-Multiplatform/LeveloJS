//! Small node bookkeeping used by the renderer.
//!
//! This is not a virtual DOM and it is not a tree-diffing engine. The core
//! only needs stable node identity and enough parent/child bookkeeping to
//! maintain ownership and lifecycle correctly.

use std::collections::HashMap;

use crate::{error::CoreError, value::Value};

/// Stable identity for a node owned by the renderer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct NodeId(u64);

impl NodeId {
    pub const fn new(value: u64) -> Self {
        Self(value)
    }

    pub const fn get(self) -> u64 {
        self.0
    }
}

impl std::fmt::Display for NodeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

/// Platform-neutral node category.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeKind {
    Element,
    Text,
}

/// Platform-neutral renderer node state.
///
/// The node stores only information required by the shared core. Platform
/// objects such as DOM elements, Android Views, or Windows controls remain
/// outside this structure.
#[derive(Debug, Clone)]
pub struct Node {
    id: NodeId,
    kind: NodeKind,
    parent: Option<NodeId>,
    children: Vec<NodeId>,
    properties: HashMap<String, Value>,
    styles: HashMap<String, String>,
    text: Option<String>,
}

impl Node {
    pub fn new(id: NodeId, kind: NodeKind) -> Self {
        Self {
            id,
            kind,
            parent: None,
            children: Vec::new(),
            properties: HashMap::new(),
            styles: HashMap::new(),
            text: None,
        }
    }

    pub fn id(&self) -> NodeId {
        self.id
    }

    pub fn kind(&self) -> NodeKind {
        self.kind
    }

    pub fn parent(&self) -> Option<NodeId> {
        self.parent
    }

    pub fn children(&self) -> &[NodeId] {
        &self.children
    }

    pub fn properties(&self) -> &HashMap<String, Value> {
        &self.properties
    }

    pub fn styles(&self) -> &HashMap<String, String> {
        &self.styles
    }

    pub fn text(&self) -> Option<&str> {
        self.text.as_deref()
    }

    pub fn set_property(&mut self, name: String, value: Value) {
        self.properties.insert(name, value);
    }

    pub fn remove_property(&mut self, name: &str) {
        self.properties.remove(name);
    }

    pub fn set_style(&mut self, name: String, value: String) {
        self.styles.insert(name, value);
    }

    pub fn remove_style(&mut self, name: &str) {
        self.styles.remove(name);
    }

    pub fn set_text(&mut self, text: String) {
        self.text = Some(text);
    }
}

/// Stores all nodes currently owned by the renderer.
///
/// `NodeStore` is responsible for maintaining the structural invariants:
///
/// - every attached child exists;
/// - every attached child has exactly one parent;
/// - a parent cannot contain the same child twice;
/// - a node cannot become its own ancestor;
/// - removing a node detaches it from its parent and children.
#[derive(Debug, Default)]
pub struct NodeStore {
    nodes: HashMap<NodeId, Node>,
}

impl NodeStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn contains(&self, id: NodeId) -> bool {
        self.nodes.contains_key(&id)
    }

    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    pub fn insert(&mut self, node: Node) -> Result<(), CoreError> {
        let id = node.id();

        if self.nodes.contains_key(&id) {
            return Err(CoreError::DuplicateNode(id.get()));
        }

        self.nodes.insert(id, node);
        Ok(())
    }

    pub fn get(&self, id: NodeId) -> Option<&Node> {
        self.nodes.get(&id)
    }

    pub fn get_mut(&mut self, id: NodeId) -> Option<&mut Node> {
        self.nodes.get_mut(&id)
    }

    /// Removes a node and repairs all structural references to it.
    ///
    /// Children are detached from the removed node but remain alive in the
    /// store. This keeps deletion composable with explicit child deletion
    /// operations.
    pub fn remove(&mut self, id: NodeId) -> Option<Node> {
        let node = self.nodes.remove(&id)?;

        if let Some(parent_id) = node.parent
            && let Some(parent) = self.nodes.get_mut(&parent_id)
        {
            parent.children.retain(|child| *child != id);
        }

        for child_id in &node.children {
            if let Some(child) = self.nodes.get_mut(child_id)
                && child.parent == Some(id)
            {
                child.parent = None;
            }
        }

        Some(node)
    }

    /// Attaches `child` to `parent`.
    ///
    /// If the child already belongs to another parent it is moved rather than
    /// duplicated. Re-attaching an existing child to the same parent is a no-op.
    pub fn attach_child(&mut self, parent: NodeId, child: NodeId) -> Result<(), CoreError> {
        if parent == child {
            return Err(CoreError::SelfParent(parent.get()));
        }

        self.ensure_exists(parent)?;
        self.ensure_exists(child)?;

        let current_parent = self.nodes.get(&child).and_then(Node::parent);

        // Re-attaching to the same parent is already satisfied.
        if current_parent == Some(parent) {
            return Ok(());
        }

        // Attaching an ancestor below its descendant would create a cycle.
        if self.is_ancestor(child, parent) {
            return Err(CoreError::SelfParent(parent.get()));
        }

        // Remove the child from its previous parent.
        if let Some(old_parent) = current_parent
            && let Some(old_parent_node) = self.nodes.get_mut(&old_parent)
        {
            old_parent_node.children.retain(|id| *id != child);
        }

        // Add the child to the new parent.
        let parent_node = self
            .nodes
            .get_mut(&parent)
            .ok_or(CoreError::UnknownNode(parent.get()))?;

        if !parent_node.children.contains(&child) {
            parent_node.children.push(child);
        }

        // Update the child's parent reference.
        let child_node = self
            .nodes
            .get_mut(&child)
            .ok_or(CoreError::UnknownNode(child.get()))?;

        child_node.parent = Some(parent);

        Ok(())
    }

    /// Detaches `child` from `parent`.
    pub fn detach_child(&mut self, parent: NodeId, child: NodeId) -> Result<(), CoreError> {
        self.ensure_exists(parent)?;
        self.ensure_exists(child)?;

        let parent_node = self
            .nodes
            .get_mut(&parent)
            .ok_or(CoreError::UnknownNode(parent.get()))?;

        let index = parent_node
            .children
            .iter()
            .position(|id| *id == child)
            .ok_or(CoreError::ChildNotAttached {
                parent: parent.get(),
                child: child.get(),
            })?;

        parent_node.children.remove(index);

        let child_node = self
            .nodes
            .get_mut(&child)
            .ok_or(CoreError::UnknownNode(child.get()))?;

        if child_node.parent == Some(parent) {
            child_node.parent = None;
        }

        Ok(())
    }

    /// Moves an existing child immediately before another child.
    pub fn insert_before(
        &mut self,
        parent: NodeId,
        child: NodeId,
        reference: NodeId,
    ) -> Result<(), CoreError> {
        if child == reference {
            return Ok(());
        }

        self.ensure_exists(parent)?;
        self.ensure_exists(child)?;
        self.ensure_exists(reference)?;

        let reference_attached = self
            .nodes
            .get(&parent)
            .map(|node| node.children.contains(&reference))
            .unwrap_or(false);

        if !reference_attached {
            return Err(CoreError::ChildNotAttached {
                parent: parent.get(),
                child: reference.get(),
            });
        }

        self.attach_child(parent, child)?;

        let parent_node = self
            .nodes
            .get_mut(&parent)
            .ok_or(CoreError::UnknownNode(parent.get()))?;

        if let Some(index) = parent_node.children.iter().position(|id| *id == child) {
            parent_node.children.remove(index);
        }

        let reference_index = parent_node
            .children
            .iter()
            .position(|id| *id == reference)
            .ok_or(CoreError::ChildNotAttached {
                parent: parent.get(),
                child: reference.get(),
            })?;

        parent_node.children.insert(reference_index, child);

        Ok(())
    }

    /// Replaces `old_child` with `new_child` under `parent`.
    pub fn replace_child(
        &mut self,
        parent: NodeId,
        new_child: NodeId,
        old_child: NodeId,
    ) -> Result<(), CoreError> {
        if new_child == old_child {
            return Ok(());
        }

        self.ensure_exists(parent)?;
        self.ensure_exists(new_child)?;
        self.ensure_exists(old_child)?;

        let old_index = self
            .nodes
            .get(&parent)
            .and_then(|node| node.children.iter().position(|id| *id == old_child))
            .ok_or(CoreError::ChildNotAttached {
                parent: parent.get(),
                child: old_child.get(),
            })?;

        if self.is_ancestor(new_child, parent) {
            return Err(CoreError::SelfParent(parent.get()));
        }

        let existing_parent = self.nodes.get(&new_child).and_then(Node::parent);

        if let Some(existing_parent) = existing_parent
            && let Some(existing_parent_node) = self.nodes.get_mut(&existing_parent)
        {
            existing_parent_node.children.retain(|id| *id != new_child);
        }

        let adjusted_index = if existing_parent == Some(parent) {
            let new_index = self
                .nodes
                .get(&parent)
                .and_then(|node| node.children.iter().position(|id| *id == new_child));

            match new_index {
                Some(index) if index < old_index => old_index.saturating_sub(1),
                _ => old_index,
            }
        } else {
            old_index
        };

        let parent_node = self
            .nodes
            .get_mut(&parent)
            .ok_or(CoreError::UnknownNode(parent.get()))?;

        if adjusted_index >= parent_node.children.len() {
            return Err(CoreError::ChildNotAttached {
                parent: parent.get(),
                child: old_child.get(),
            });
        }

        parent_node.children[adjusted_index] = new_child;

        let old_node = self
            .nodes
            .get_mut(&old_child)
            .ok_or(CoreError::UnknownNode(old_child.get()))?;

        if old_node.parent == Some(parent) {
            old_node.parent = None;
        }

        let new_node = self
            .nodes
            .get_mut(&new_child)
            .ok_or(CoreError::UnknownNode(new_child.get()))?;

        new_node.parent = Some(parent);

        Ok(())
    }

    fn ensure_exists(&self, id: NodeId) -> Result<(), CoreError> {
        if self.nodes.contains_key(&id) {
            Ok(())
        } else {
            Err(CoreError::UnknownNode(id.get()))
        }
    }

    /// Returns whether `ancestor` occurs in the parent chain of `node`.
    fn is_ancestor(&self, ancestor: NodeId, node: NodeId) -> bool {
        let mut current = Some(node);

        while let Some(id) = current {
            if id == ancestor {
                return true;
            }

            current = self.nodes.get(&id).and_then(Node::parent);
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn element(id: u64) -> Node {
        Node::new(NodeId::new(id), NodeKind::Element)
    }

    fn text(id: u64) -> Node {
        Node::new(NodeId::new(id), NodeKind::Text)
    }

    #[test]
    fn attaches_and_detaches_children() {
        let parent = NodeId::new(1);
        let child = NodeId::new(2);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();

        store.attach_child(parent, child).unwrap();

        assert_eq!(store.get(child).unwrap().parent(), Some(parent));
        assert_eq!(store.get(parent).unwrap().children(), &[child]);

        store.detach_child(parent, child).unwrap();

        assert_eq!(store.get(child).unwrap().parent(), None);
        assert!(store.get(parent).unwrap().children().is_empty());
    }

    #[test]
    fn reattaching_same_child_is_idempotent() {
        let parent = NodeId::new(1);
        let child = NodeId::new(2);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();

        store.attach_child(parent, child).unwrap();
        store.attach_child(parent, child).unwrap();

        assert_eq!(store.get(parent).unwrap().children(), &[child]);
        assert_eq!(store.get(child).unwrap().parent(), Some(parent));
    }

    #[test]
    fn attaching_to_new_parent_moves_child() {
        let first_parent = NodeId::new(1);
        let second_parent = NodeId::new(2);
        let child = NodeId::new(3);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(element(2)).unwrap();
        store.insert(text(3)).unwrap();

        store.attach_child(first_parent, child).unwrap();
        store.attach_child(second_parent, child).unwrap();

        assert!(store.get(first_parent).unwrap().children().is_empty());
        assert_eq!(store.get(second_parent).unwrap().children(), &[child]);
        assert_eq!(store.get(child).unwrap().parent(), Some(second_parent));
    }

    #[test]
    fn rejects_structural_cycles() {
        let root = NodeId::new(1);
        let child = NodeId::new(2);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(element(2)).unwrap();

        store.attach_child(root, child).unwrap();

        let error = store.attach_child(child, root).unwrap_err();

        assert_eq!(error, CoreError::SelfParent(child.get()));
    }

    #[test]
    fn insert_before_preserves_order() {
        let parent = NodeId::new(1);
        let first = NodeId::new(2);
        let second = NodeId::new(3);
        let third = NodeId::new(4);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();
        store.insert(text(3)).unwrap();
        store.insert(text(4)).unwrap();

        store.attach_child(parent, first).unwrap();
        store.attach_child(parent, third).unwrap();
        store.insert_before(parent, second, third).unwrap();

        assert_eq!(
            store.get(parent).unwrap().children(),
            &[first, second, third]
        );
    }

    #[test]
    fn replacing_child_updates_parent_links() {
        let parent = NodeId::new(1);
        let old_child = NodeId::new(2);
        let new_child = NodeId::new(3);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();
        store.insert(text(3)).unwrap();

        store.attach_child(parent, old_child).unwrap();
        store.replace_child(parent, new_child, old_child).unwrap();

        assert_eq!(store.get(parent).unwrap().children(), &[new_child]);
        assert_eq!(store.get(old_child).unwrap().parent(), None);
        assert_eq!(store.get(new_child).unwrap().parent(), Some(parent));
    }

    #[test]
    fn removing_node_repairs_relationships() {
        let parent = NodeId::new(1);
        let child = NodeId::new(2);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();

        store.attach_child(parent, child).unwrap();

        store.remove(parent);

        assert!(!store.contains(parent));
        assert_eq!(store.get(child).unwrap().parent(), None);
    }

    #[test]
    fn removing_child_detaches_it_from_parent() {
        let parent = NodeId::new(1);
        let child = NodeId::new(2);

        let mut store = NodeStore::new();
        store.insert(element(1)).unwrap();
        store.insert(text(2)).unwrap();

        store.attach_child(parent, child).unwrap();

        store.remove(child);

        assert!(store.get(parent).unwrap().children().is_empty());
        assert!(!store.contains(child));
    }
}
