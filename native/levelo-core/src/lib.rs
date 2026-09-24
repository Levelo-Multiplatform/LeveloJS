//! The native, platform-neutral core of LeveloJS.
//!
//! The public JavaScript API and platform adapters live outside this crate.
//! This crate owns the shared engine: renderer state, targeted operations,
//! scheduling, and the small amount of bookkeeping needed to keep those
//! pieces connected.

#![forbid(unsafe_code)]

pub mod error;
pub mod operations;
pub mod patch;
pub mod renderer;
pub mod scheduler;
pub mod tree;
pub mod value;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns the version of the native Levelo core.
pub fn version() -> &'static str {
    VERSION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_package_version() {
        assert_eq!(version(), env!("CARGO_PKG_VERSION"));
    }
}
