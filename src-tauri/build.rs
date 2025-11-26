#[path = "src/icon_support.rs"]
mod icon_support;

fn main() {
    icon_support::ensure_default_icon();
    tauri_build::build()
}
