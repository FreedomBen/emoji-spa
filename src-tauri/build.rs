use std::{env, fs, path::PathBuf};

const ICON_PNG_HEX: &str = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082";

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    let hex = hex.trim();
    if hex.len() % 2 != 0 {
        return Err("hex string must have even length".to_string());
    }

    let mut out = Vec::with_capacity(hex.len() / 2);
    let bytes = hex.as_bytes();

    let mut i = 0;
    while i < bytes.len() {
        let hi = bytes[i];
        let lo = bytes[i + 1];

        let nibble = |b: u8| -> Result<u8, String> {
            match b {
                b'0'..=b'9' => Ok(b - b'0'),
                b'a'..=b'f' => Ok(b - b'a' + 10),
                b'A'..=b'F' => Ok(b - b'A' + 10),
                _ => Err("invalid hex digit".to_string()),
            }
        };

        let high = nibble(hi)?;
        let low = nibble(lo)?;
        out.push((high << 4) | low);

        i += 2;
    }

    Ok(out)
}

fn ensure_default_icon() {
    let manifest_dir =
        env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set by Cargo");
    let mut icons_dir = PathBuf::from(manifest_dir);
    icons_dir.push("icons");

    if let Err(error) = fs::create_dir_all(&icons_dir) {
        eprintln!("warning: failed to create icons directory: {error}");
        return;
    }

    let mut icon_path = icons_dir.clone();
    icon_path.push("icon.png");

    if icon_path.exists() {
        return;
    }

    match hex_to_bytes(ICON_PNG_HEX) {
        Ok(bytes) => {
            if let Err(error) = fs::write(&icon_path, bytes) {
                eprintln!("warning: failed to write default icon: {error}");
            }
        }
        Err(error) => {
            eprintln!("warning: failed to decode embedded icon: {error}");
        }
    }
}

fn main() {
    ensure_default_icon();
    tauri_build::build()
}
