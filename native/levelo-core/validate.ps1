$ErrorActionPreference = "Stop"

cargo fmt --check
cargo check
cargo test
cargo clippy --all-targets --all-features -- -D warnings

Write-Host "levelo-core validation passed."
