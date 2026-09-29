//! Errors shared by the core.
//!
//! Keep these errors independent of any platform. A DOM error, Android error,
//! or Windows API error belongs in the adapter that talks to that platform.

use std::fmt;

/// Errors that can be raised while manipulating core renderer state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoreError {
    /// An operation referenced a node that is not known to the core.
    UnknownNode(NodeIdValue),

    /// A node was asked to use itself as its own parent.
    SelfParent(NodeIdValue),

    /// An operation attempted to create a node using an ID that already exists.
    DuplicateNode(NodeIdValue),

    /// A node was expected to have a parent, but does not.
    MissingParent(NodeIdValue),

    /// An operation referenced a child that is not attached to the requested parent.
    ChildNotAttached {
        parent: NodeIdValue,
        child: NodeIdValue,
    },
}

impl fmt::Display for CoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownNode(id) => write!(f, "unknown node {id}"),
            Self::SelfParent(id) => write!(f, "node {id} cannot be its own parent"),
            Self::DuplicateNode(id) => write!(f, "node {id} already exists"),
            Self::MissingParent(id) => write!(f, "node {id} has no parent"),
            Self::ChildNotAttached { parent, child } => {
                write!(f, "node {child} is not attached to parent {parent}")
            }
        }
    }
}

impl std::error::Error for CoreError {}

/// Kept as a small alias so the error module does not need to depend on the
/// renderer module and create a circular module relationship.
pub type NodeIdValue = u64;
