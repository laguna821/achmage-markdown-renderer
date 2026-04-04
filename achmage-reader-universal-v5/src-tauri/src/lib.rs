use std::{
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
    time::UNIX_EPOCH,
};

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    selected_vault_path: Option<String>,
    recent_vaults: Vec<String>,
    preferred_theme: Option<String>,
    last_open_doc: Option<LastOpenDoc>,
    window_state: Option<WindowState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LastOpenDoc {
    slug: String,
    output_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WindowState {
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultFileSnapshot {
    file_path: String,
    relative_path: String,
    size: u64,
    mtime_ms: u64,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultState {
    root_path: String,
    doc_count: usize,
    last_indexed_at: Option<String>,
    watch_status: String,
    signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultSnapshot {
    state: VaultState,
    files: Vec<VaultFileSnapshot>,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    fs::create_dir_all(&app_dir).map_err(|error| format!("failed to create app data dir: {error}"))?;
    Ok(app_dir.join("settings.json"))
}

fn load_settings_internal(app: &AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let raw = fs::read_to_string(&path).map_err(|error| format!("failed to read settings: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("failed to parse settings: {error}"))
}

fn save_settings_internal(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    let raw =
        serde_json::to_string_pretty(settings).map_err(|error| format!("failed to serialize settings: {error}"))?;
    fs::write(path, raw).map_err(|error| format!("failed to write settings: {error}"))
}

fn normalize_path_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn contains_markdown_files(entry: &Path) -> bool {
    matches!(
        entry.extension().and_then(|extension| extension.to_str()),
        Some("md") | Some("MD") | Some("mdx") | Some("MDX")
    )
}

fn compute_snapshot(root_path: &str, include_contents: bool) -> Result<VaultSnapshot, String> {
    let root = PathBuf::from(root_path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("vault path is not a directory: {root_path}"));
    }

    let mut hash = Sha256::new();
    hash.update(normalize_path_string(&root));

    let mut files = Vec::new();
    let mut last_indexed_at = None;

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !entry.file_type().is_file() || !contains_markdown_files(path) {
            continue;
        }

        let metadata = fs::metadata(path).map_err(|error| format!("failed to read metadata: {error}"))?;
        let modified = metadata
            .modified()
            .map_err(|error| format!("failed to read modified time: {error}"))?;
        let modified_ms = modified
            .duration_since(UNIX_EPOCH)
            .map_err(|error| format!("failed to normalize modified time: {error}"))?
            .as_millis() as u64;
        let relative = path
            .strip_prefix(&root)
            .map_err(|error| format!("failed to compute relative path: {error}"))?;

        hash.update(normalize_path_string(path));
        hash.update(metadata.len().to_string());
        hash.update(modified_ms.to_string());

        let content = if include_contents {
            fs::read_to_string(path).map_err(|error| format!("failed to read markdown file: {error}"))?
        } else {
            String::new()
        };

        files.push(VaultFileSnapshot {
            file_path: normalize_path_string(path),
            relative_path: normalize_path_string(relative),
            size: metadata.len(),
            mtime_ms: modified_ms,
            content,
        });

        last_indexed_at = Some(modified_ms.to_string());
    }

    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    Ok(VaultSnapshot {
        state: VaultState {
            root_path: normalize_path_string(&root),
            doc_count: files.len(),
            last_indexed_at,
            watch_status: "polling".into(),
            signature: format!("{:x}", hash.finalize()),
        },
        files,
    })
}

fn sanitize_relative_path(path: &str) -> PathBuf {
    let mut sanitized = PathBuf::new();
    for component in Path::new(path).components() {
        match component {
            Component::Normal(part) => sanitized.push(part),
            Component::CurDir => {}
            _ => {}
        }
    }
    sanitized
}

fn detect_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    }
}

fn resolve_asset_path(root_path: &str, document_path: &str, asset_path: &str) -> Result<PathBuf, String> {
    if asset_path.starts_with("http://")
        || asset_path.starts_with("https://")
        || asset_path.starts_with("data:")
        || asset_path.starts_with('/')
    {
        return Err("asset path does not require local resolution".into());
    }

    let root = PathBuf::from(root_path);
    let document = PathBuf::from(document_path);
    let candidate = document
        .parent()
        .unwrap_or(document.as_path())
        .join(sanitize_relative_path(asset_path));

    if candidate.exists() && candidate.starts_with(&root) {
        return Ok(candidate);
    }

    let asset_name = Path::new(asset_path)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("invalid asset path: {asset_path}"))?;

    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        if entry.file_type().is_file()
            && entry
                .path()
                .file_name()
                .and_then(|value| value.to_str())
                .map(|value| value.eq_ignore_ascii_case(asset_name))
                .unwrap_or(false)
        {
            return Ok(entry.path().to_path_buf());
        }
    }

    Err(format!("asset not found: {asset_path}"))
}

#[tauri::command]
fn load_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    load_settings_internal(&app)
}

#[tauri::command]
fn save_app_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings_internal(&app, &settings)
}

#[tauri::command]
fn get_vault_state(root_path: String) -> Result<VaultState, String> {
    Ok(compute_snapshot(&root_path, false)?.state)
}

#[tauri::command]
fn read_vault_snapshot(root_path: String) -> Result<VaultSnapshot, String> {
    compute_snapshot(&root_path, true)
}

#[tauri::command]
fn read_asset_data_url(root_path: String, document_path: String, asset_path: String) -> Result<String, String> {
    let resolved = resolve_asset_path(&root_path, &document_path, &asset_path)?;
    let mut file = fs::File::open(&resolved).map_err(|error| format!("failed to open asset: {error}"))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|error| format!("failed to read asset: {error}"))?;
    let mime_type = detect_mime_type(&resolved);
    let encoded = BASE64_STANDARD.encode(buffer);
    Ok(format!("data:{mime_type};base64,{encoded}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_app_settings,
            save_app_settings,
            get_vault_state,
            read_vault_snapshot,
            read_asset_data_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
