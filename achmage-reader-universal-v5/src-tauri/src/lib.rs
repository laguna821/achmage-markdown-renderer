use std::{
    collections::HashMap,
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
struct VaultScanFile {
    file_path: String,
    relative_path: String,
    size: u64,
    mtime_ms: u64,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultScan {
    state: VaultState,
    files: Vec<VaultScanFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultBatchFile {
    relative_path: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultFileBatch {
    files: Vec<VaultBatchFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultValidationError {
    relative_path: String,
    stage: String,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultLoadReport {
    generated_at: String,
    phase: String,
    vault_path: Option<String>,
    total_files: usize,
    validated_files: usize,
    current_relative_path: Option<String>,
    fatal_count: usize,
    first_fatal_errors: Vec<VaultValidationError>,
    error: Option<String>,
    signature: Option<String>,
    errors: Vec<VaultValidationError>,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    fs::create_dir_all(&app_dir).map_err(|error| format!("failed to create app data dir: {error}"))?;
    Ok(app_dir.join("settings.json"))
}

fn load_report_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    fs::create_dir_all(&app_dir).map_err(|error| format!("failed to create app data dir: {error}"))?;
    Ok(app_dir.join("vault-load-report.json"))
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

fn compute_scan(root_path: &str) -> Result<VaultScan, String> {
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

        files.push(VaultScanFile {
            file_path: normalize_path_string(path),
            relative_path: normalize_path_string(relative),
            size: metadata.len(),
            mtime_ms: modified_ms,
        });

        last_indexed_at = Some(modified_ms.to_string());
    }

    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    Ok(VaultScan {
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

fn read_vault_batch_internal(root_path: &str, relative_paths: &[String]) -> Result<VaultFileBatch, String> {
    let root = PathBuf::from(root_path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("vault path is not a directory: {root_path}"));
    }

    let mut files = Vec::new();

    for relative_path in relative_paths {
        let sanitized = sanitize_relative_path(relative_path);
        let resolved = root.join(&sanitized);

        if !resolved.starts_with(&root) {
            return Err(format!("resolved path escapes vault root: {relative_path}"));
        }

        if !resolved.exists() || !resolved.is_file() {
            return Err(format!("markdown file does not exist: {relative_path}"));
        }

        if !contains_markdown_files(&resolved) {
            return Err(format!("requested path is not a markdown file: {relative_path}"));
        }

        let content =
            fs::read_to_string(&resolved).map_err(|error| format!("failed to read markdown file: {error}"))?;

        files.push(VaultBatchFile {
            relative_path: normalize_path_string(&sanitized),
            content,
        });
    }

    Ok(VaultFileBatch { files })
}

fn compute_snapshot(root_path: &str, include_contents: bool) -> Result<VaultSnapshot, String> {
    let scan = compute_scan(root_path)?;
    let content_by_relative_path = if include_contents {
        let relative_paths = scan
            .files
            .iter()
            .map(|file| file.relative_path.clone())
            .collect::<Vec<_>>();
        read_vault_batch_internal(root_path, &relative_paths)?
            .files
            .into_iter()
            .map(|file| (file.relative_path, file.content))
            .collect::<HashMap<_, _>>()
    } else {
        HashMap::new()
    };

    Ok(VaultSnapshot {
        state: scan.state,
        files: scan
            .files
            .into_iter()
            .map(|file| VaultFileSnapshot {
                file_path: file.file_path,
                relative_path: file.relative_path.clone(),
                size: file.size,
                mtime_ms: file.mtime_ms,
                content: content_by_relative_path
                    .get(&file.relative_path)
                    .cloned()
                    .unwrap_or_default(),
            })
            .collect(),
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
fn save_vault_load_report(app: AppHandle, report: VaultLoadReport) -> Result<(), String> {
    let path = load_report_path(&app)?;
    let raw =
        serde_json::to_string_pretty(&report).map_err(|error| format!("failed to serialize load report: {error}"))?;
    fs::write(path, raw).map_err(|error| format!("failed to write load report: {error}"))
}

#[tauri::command]
fn get_vault_state(root_path: String) -> Result<VaultState, String> {
    Ok(compute_scan(&root_path)?.state)
}

#[tauri::command]
fn scan_vault(root_path: String) -> Result<VaultScan, String> {
    compute_scan(&root_path)
}

#[tauri::command]
fn read_vault_batch(root_path: String, relative_paths: Vec<String>) -> Result<VaultFileBatch, String> {
    read_vault_batch_internal(&root_path, &relative_paths)
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
            save_vault_load_report,
            get_vault_state,
            scan_vault,
            read_vault_batch,
            read_vault_snapshot,
            read_asset_data_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        env,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn create_temp_vault_dir(name: &str) -> PathBuf {
        let mut path = env::temp_dir();
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        path.push(format!("achmage-reader-vault-test-{name}-{suffix}"));
        fs::create_dir_all(&path).expect("temp vault dir should be created");
        path
    }

    #[test]
    fn scan_vault_returns_metadata_only_for_markdown_files() {
        let vault_dir = create_temp_vault_dir("scan");
        fs::write(vault_dir.join("alpha.md"), "# Alpha").expect("alpha markdown should be written");
        fs::write(vault_dir.join("ignore.txt"), "nope").expect("txt file should be written");

        let scan = compute_scan(vault_dir.to_str().expect("utf8 path")).expect("scan should succeed");

        assert_eq!(scan.files.len(), 1);
        assert_eq!(scan.files[0].relative_path, "alpha.md");
        let serialized = serde_json::to_value(&scan).expect("scan should serialize");
        assert!(serialized["files"][0].get("content").is_none());

        fs::remove_dir_all(vault_dir).expect("temp vault dir should be cleaned up");
    }

    #[test]
    fn read_vault_batch_preserves_requested_relative_path_order() {
        let vault_dir = create_temp_vault_dir("batch");
        fs::write(vault_dir.join("a.md"), "# A").expect("a markdown should be written");
        fs::write(vault_dir.join("b.md"), "# B").expect("b markdown should be written");

        let relative_paths = vec!["b.md".to_string(), "a.md".to_string()];
        let batch = read_vault_batch_internal(vault_dir.to_str().expect("utf8 path"), &relative_paths)
            .expect("batch read should succeed");

        assert_eq!(batch.files.len(), 2);
        assert_eq!(batch.files[0].relative_path, "b.md");
        assert_eq!(batch.files[1].relative_path, "a.md");

        fs::remove_dir_all(vault_dir).expect("temp vault dir should be cleaned up");
    }
}
