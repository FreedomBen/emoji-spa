use std::{fs, path::{Path, PathBuf}};
#[cfg(not(test))]
use std::env;

pub const ICON_PNG_HEX: &str = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082";

pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
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

fn write_default_icon_into(icons_dir: &Path) {
    if let Err(error) = fs::create_dir_all(icons_dir) {
        eprintln!("warning: failed to create icons directory: {error}");
        return;
    }

    let mut icon_path = PathBuf::from(icons_dir);
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

#[cfg(not(test))]
pub fn ensure_default_icon() {
    let manifest_dir =
        env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set by Cargo");
    let mut icons_dir = PathBuf::from(manifest_dir);
    icons_dir.push("icons");
    write_default_icon_into(&icons_dir);
}

#[cfg(test)]
pub fn ensure_default_icon_in_dir(base_dir: &Path) {
    let mut icons_dir = PathBuf::from(base_dir);
    icons_dir.push("icons");
    write_default_icon_into(&icons_dir);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Read;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn hex_to_bytes_parses_valid_hex() {
        let bytes = hex_to_bytes("00ff10").expect("expected valid hex");
        assert_eq!(bytes, vec![0x00, 0xff, 0x10]);
    }

    #[test]
    fn hex_to_bytes_rejects_invalid_input() {
        assert!(hex_to_bytes("0").is_err());
        assert!(hex_to_bytes("gg").is_err());
    }

    #[test]
    fn ensure_default_icon_in_dir_creates_png_with_expected_header() {
        let base = std::env::temp_dir();
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            .to_string();
        let test_dir = base.join(format!("emoji_spa_icon_test_{unique}"));

        ensure_default_icon_in_dir(&test_dir);

        let icon_path = test_dir.join("icons").join("icon.png");
        assert!(icon_path.exists(), "icon.png should be created");

        let mut file = fs::File::open(&icon_path).expect("failed to open generated icon");
        let mut header = [0u8; 8];
        file.read_exact(&mut header).expect("failed to read PNG header");

        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
        assert_eq!(&header, b"\x89PNG\r\n\x1a\n");

        let _ = fs::remove_dir_all(&test_dir);
    }
}
