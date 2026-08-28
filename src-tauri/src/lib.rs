use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

const BUNDLE_VERSION: u8 = 1;
const MAX_SAVE_BYTES: u64 = 128 * 1024 * 1024;
const SAVE_EXTENSIONS: &[&str] = &[
    "srm", "sav", "dat", "rtc", "mcr", "mc", "raw", "dsv", "sps", "gci", "eep", "fla", "ram", "nv",
    "fs",
];

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("Could not access that folder or file: {0}")]
    Io(#[from] io::Error),
    #[error("The bundle is not a valid Retro Save bundle: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("The bundle metadata is unreadable: {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Invalid(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SaveEntry {
    pub id: String,
    pub path: String,
    pub relative_path: String,
    pub file_name: String,
    pub game_name: String,
    pub extension: String,
    pub format_label: String,
    pub emulator: String,
    pub size: u64,
    pub modified: Option<String>,
    pub sha256: String,
    pub confidence: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    root: String,
    scanned_files: usize,
    skipped_files: usize,
    entries: Vec<SaveEntry>,
    warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleManifest {
    bundle_version: u8,
    created_at: String,
    app_version: String,
    source_root: String,
    note: Option<String>,
    files: Vec<SaveEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleSummary {
    path: String,
    file_count: usize,
    total_bytes: u64,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportItem {
    entry: SaveEntry,
    destination: String,
    status: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPlan {
    bundle_path: String,
    target_root: String,
    created_at: String,
    note: Option<String>,
    items: Vec<ImportItem>,
    compatible_count: usize,
    warning_count: usize,
    overwrite_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    restored_count: usize,
    total_bytes: u64,
    target_root: String,
}

fn supported_extension(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    SAVE_EXTENSIONS.contains(&ext.as_str()).then_some(ext)
}

fn format_for_extension(ext: &str) -> &'static str {
    match ext {
        "srm" => "Battery save (SRM)",
        "sav" => "Native battery save (SAV)",
        "rtc" => "Real-time clock sidecar",
        "mcr" | "mc" => "PlayStation memory card",
        "dsv" => "DeSmuME save",
        "sps" => "GBA snapshot save",
        "gci" => "GameCube save",
        "eep" => "EEPROM save",
        "fla" => "Flash memory save",
        "raw" => "Raw memory card/save",
        "dat" => "Emulator data save",
        "ram" | "nv" | "fs" => "Emulator memory save",
        _ => "Recognised save",
    }
}

fn detect_emulator(path: &Path) -> (&'static str, &'static str) {
    let value = path.to_string_lossy().to_ascii_lowercase();
    let known = [
        ("retroarch", "RetroArch"),
        ("duckstation", "DuckStation"),
        ("pcsx2", "PCSX2"),
        ("dolphin", "Dolphin"),
        ("mgba", "mGBA"),
        ("visualboyadvance", "VisualBoyAdvance"),
        ("desmume", "DeSmuME"),
        ("melonds", "melonDS"),
        ("snes9x", "Snes9x"),
        ("ppsspp", "PPSSPP"),
        ("bizhawk", "BizHawk"),
    ];
    for (needle, label) in known {
        if value.contains(needle) {
            return (label, "high");
        }
    }
    ("Unknown emulator", "extension-only")
}

fn game_name(path: &Path) -> String {
    let raw = path
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Unknown game");
    let mut cleaned = raw
        .replace(['_', '.'], " ")
        .replace(" (Auto)", "")
        .replace("-SaveRAM", "")
        .replace(".state", "");
    if cleaned.trim().is_empty() {
        cleaned = "Unknown game".into();
    }
    cleaned.trim().to_string()
}

fn sha256_reader(mut reader: impl Read) -> AppResult<String> {
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn entry_for(root: &Path, path: &Path) -> AppResult<SaveEntry> {
    let metadata = fs::metadata(path)?;
    let relative = path
        .strip_prefix(root)
        .map_err(|_| AppError::Invalid("A selected file is outside the scanned folder.".into()))?;
    let extension = supported_extension(path)
        .ok_or_else(|| AppError::Invalid("That file is not a supported save format.".into()))?;
    let sha256 = sha256_reader(File::open(path)?)?;
    let (emulator, confidence) = detect_emulator(path);
    let modified = metadata.modified().ok().map(|time| {
        let stamp: DateTime<Utc> = time.into();
        stamp.to_rfc3339()
    });
    Ok(SaveEntry {
        id: sha256[..16].to_string(),
        path: path.to_string_lossy().to_string(),
        relative_path: relative.to_string_lossy().replace('\\', "/"),
        file_name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        game_name: game_name(path),
        extension: extension.clone(),
        format_label: format_for_extension(&extension).into(),
        emulator: emulator.into(),
        size: metadata.len(),
        modified,
        sha256,
        confidence: confidence.into(),
    })
}

#[tauri::command]
fn scan_directory(path: String) -> AppResult<ScanResult> {
    let root = fs::canonicalize(&path)?;
    if !root.is_dir() {
        return Err(AppError::Invalid("Choose a folder, not a file.".into()));
    }
    let mut entries = Vec::new();
    let mut scanned_files = 0;
    let mut skipped_files = 0;
    let mut warnings = Vec::new();

    for item in WalkDir::new(&root).follow_links(false).max_depth(14) {
        let item = match item {
            Ok(item) => item,
            Err(error) => {
                skipped_files += 1;
                warnings.push(format!("Skipped an unreadable location: {error}"));
                continue;
            }
        };
        if !item.file_type().is_file() {
            continue;
        }
        scanned_files += 1;
        if supported_extension(item.path()).is_none() {
            continue;
        }
        match item.metadata() {
            Ok(meta) if meta.len() > MAX_SAVE_BYTES => {
                skipped_files += 1;
                warnings.push(format!(
                    "Skipped {} because it is larger than 128 MB.",
                    item.path().display()
                ));
            }
            Ok(_) => match entry_for(&root, item.path()) {
                Ok(entry) => entries.push(entry),
                Err(error) => {
                    skipped_files += 1;
                    warnings.push(format!("Skipped {}: {error}", item.path().display()));
                }
            },
            Err(error) => {
                skipped_files += 1;
                warnings.push(format!("Skipped {}: {error}", item.path().display()));
            }
        }
    }
    entries.sort_by(|a, b| {
        b.modified
            .cmp(&a.modified)
            .then(a.game_name.cmp(&b.game_name))
    });
    warnings.truncate(12);
    Ok(ScanResult {
        root: root.to_string_lossy().to_string(),
        scanned_files,
        skipped_files,
        entries,
        warnings,
    })
}

#[tauri::command]
fn create_bundle(
    root: String,
    paths: Vec<String>,
    output: String,
    note: Option<String>,
) -> AppResult<BundleSummary> {
    if paths.is_empty() {
        return Err(AppError::Invalid(
            "Select at least one save before creating a bundle.".into(),
        ));
    }
    let root = fs::canonicalize(root)?;
    let output_path = PathBuf::from(output);
    if output_path.exists() {
        return Err(AppError::Invalid(
            "A file already exists at that location. Choose a new bundle name.".into(),
        ));
    }
    let mut entries = Vec::new();
    for raw in paths {
        let canonical = fs::canonicalize(raw)?;
        if !canonical.starts_with(&root) {
            return Err(AppError::Invalid(
                "A selected file is outside the scanned folder.".into(),
            ));
        }
        entries.push(entry_for(&root, &canonical)?);
    }
    let created_at = Utc::now().to_rfc3339();
    let manifest = BundleManifest {
        bundle_version: BUNDLE_VERSION,
        created_at: created_at.clone(),
        app_version: env!("CARGO_PKG_VERSION").into(),
        source_root: root.to_string_lossy().to_string(),
        note: note
            .filter(|value| !value.trim().is_empty())
            .map(|value| value.trim().chars().take(500).collect()),
        files: entries.clone(),
    };
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let file = File::create(&output_path)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for entry in &entries {
        zip.start_file(format!("files/{}", entry.relative_path), options)?;
        io::copy(&mut File::open(&entry.path)?, &mut zip)?;
    }
    zip.start_file("manifest.json", options)?;
    zip.write_all(serde_json::to_string_pretty(&manifest)?.as_bytes())?;
    zip.finish()?.sync_all()?;
    Ok(BundleSummary {
        path: output_path.to_string_lossy().to_string(),
        file_count: entries.len(),
        total_bytes: entries.iter().map(|entry| entry.size).sum(),
        created_at,
    })
}

fn safe_relative(value: &str) -> AppResult<PathBuf> {
    let path = Path::new(value);
    if path.is_absolute()
        || path.components().any(|part| {
            matches!(
                part,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err(AppError::Invalid(
            "The bundle contains an unsafe file path.".into(),
        ));
    }
    Ok(path.to_path_buf())
}

fn read_manifest(bundle: &str) -> AppResult<BundleManifest> {
    let mut archive = ZipArchive::new(File::open(bundle)?)?;
    let mut source = String::new();
    archive
        .by_name("manifest.json")?
        .read_to_string(&mut source)?;
    let manifest: BundleManifest = serde_json::from_str(&source)?;
    if manifest.bundle_version != BUNDLE_VERSION {
        return Err(AppError::Invalid(format!(
            "Bundle version {} is not supported by this app.",
            manifest.bundle_version
        )));
    }
    if manifest.files.is_empty() {
        return Err(AppError::Invalid("The bundle contains no saves.".into()));
    }
    let mut paths = HashSet::new();
    for entry in &manifest.files {
        safe_relative(&entry.relative_path)?;
        if !paths.insert(&entry.relative_path) {
            return Err(AppError::Invalid(format!(
                "The bundle lists {} more than once.",
                entry.relative_path
            )));
        }
        if entry.size > MAX_SAVE_BYTES {
            return Err(AppError::Invalid(format!(
                "{} exceeds the 128 MB save-file safety limit.",
                entry.file_name
            )));
        }
        if !SAVE_EXTENSIONS.contains(&entry.extension.as_str()) {
            return Err(AppError::Invalid(format!(
                "{} has an unsupported save format.",
                entry.file_name
            )));
        }
    }
    Ok(manifest)
}

#[tauri::command]
fn inspect_bundle(bundle: String, target_root: String) -> AppResult<ImportPlan> {
    let target = PathBuf::from(&target_root);
    if !target.is_dir() {
        return Err(AppError::Invalid(
            "Choose an existing emulator save folder as the restore target.".into(),
        ));
    }
    let manifest = read_manifest(&bundle)?;
    let (target_emulator, _) = detect_emulator(&target);
    let mut compatible_count = 0;
    let mut warning_count = 0;
    let mut overwrite_count = 0;
    let mut items = Vec::new();
    for entry in manifest.files {
        let destination = target.join(safe_relative(&entry.relative_path)?);
        let exists = destination.exists();
        let emulator_mismatch = target_emulator != "Unknown emulator"
            && entry.emulator != "Unknown emulator"
            && target_emulator != entry.emulator;
        let (status, message) = if emulator_mismatch {
            warning_count += 1;
            ("warning", format!("Made for {}; target looks like {}. Confirm the target layout before restoring.", entry.emulator, target_emulator))
        } else if exists {
            overwrite_count += 1;
            (
                "overwrite",
                "A save already exists here. Restoring will replace it after confirmation.".into(),
            )
        } else if entry.confidence == "extension-only" {
            warning_count += 1;
            (
                "warning",
                "Format is recognised, but the source emulator was not identifiable.".into(),
            )
        } else {
            compatible_count += 1;
            (
                "compatible",
                "Format and emulator folder are compatible.".into(),
            )
        };
        items.push(ImportItem {
            entry,
            destination: destination.to_string_lossy().to_string(),
            status: status.into(),
            message,
        });
    }
    Ok(ImportPlan {
        bundle_path: bundle,
        target_root,
        created_at: manifest.created_at,
        note: manifest.note,
        items,
        compatible_count,
        warning_count,
        overwrite_count,
    })
}

#[tauri::command]
fn import_bundle(
    bundle: String,
    target_root: String,
    allow_overwrite: bool,
) -> AppResult<ImportSummary> {
    let manifest = read_manifest(&bundle)?;
    let target = fs::canonicalize(&target_root)?;
    let mut archive = ZipArchive::new(File::open(&bundle)?)?;
    let mut restored_count = 0;
    let mut total_bytes = 0;
    for entry in manifest.files {
        let relative = safe_relative(&entry.relative_path)?;
        let destination = target.join(&relative);
        if destination.exists() && !allow_overwrite {
            return Err(AppError::Invalid(format!(
                "{} already exists. Review the restore plan and confirm replacement.",
                destination.display()
            )));
        }
        let archive_name = format!("files/{}", entry.relative_path);
        let bundled = archive.by_name(&archive_name)?;
        if bundled.size() != entry.size {
            return Err(AppError::Invalid(format!(
                "{} does not match the size recorded in its manifest.",
                entry.file_name
            )));
        }
        let mut bytes = Vec::new();
        bundled.take(entry.size + 1).read_to_end(&mut bytes)?;
        if bytes.len() as u64 != entry.size || sha256_reader(bytes.as_slice())? != entry.sha256 {
            return Err(AppError::Invalid(format!(
                "{} failed its integrity check. Nothing was restored for this file.",
                entry.file_name
            )));
        }
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
            let canonical_parent = fs::canonicalize(parent)?;
            if !canonical_parent.starts_with(&target) {
                return Err(AppError::Invalid(
                    "A destination symlink points outside the selected restore folder.".into(),
                ));
            }
        }
        let temporary = destination.with_extension(format!("{}.rsp-tmp", entry.extension));
        fs::write(&temporary, &bytes)?;
        if destination.exists() {
            let backup = destination.with_extension(format!("{}.rsp-backup", entry.extension));
            if backup.exists() {
                fs::remove_file(&backup)?;
            }
            fs::rename(&destination, &backup)?;
            if let Err(error) = fs::rename(&temporary, &destination) {
                let _ = fs::rename(&backup, &destination);
                return Err(AppError::Io(error));
            }
            fs::remove_file(backup)?;
        } else {
            fs::rename(&temporary, &destination)?;
        }
        restored_count += 1;
        total_bytes += bytes.len() as u64;
    }
    Ok(ImportSummary {
        restored_count,
        total_bytes,
        target_root: target.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            create_bundle,
            inspect_bundle,
            import_bundle
        ])
        .run(tauri::generate_context!())
        .expect("error while running Retro Save Portability");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("rsp-{label}-{nonce}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn recognises_formats_and_emulator_paths() {
        assert_eq!(
            supported_extension(Path::new("game.SRM")),
            Some("srm".into())
        );
        assert_eq!(supported_extension(Path::new("game.rom")), None);
        assert_eq!(
            detect_emulator(Path::new("/RetroArch/saves/game.srm")).0,
            "RetroArch"
        );
    }

    #[test]
    fn scan_is_read_only_and_hashes_save() {
        let root = temp_dir("scan");
        let saves = root.join("RetroArch/saves");
        fs::create_dir_all(&saves).unwrap();
        let save = saves.join("Chrono_Trigger.srm");
        fs::write(&save, b"progress").unwrap();
        fs::write(saves.join("game.rom"), b"not scanned").unwrap();
        let before = fs::read(&save).unwrap();
        let result = scan_directory(root.to_string_lossy().into()).unwrap();
        assert_eq!(result.entries.len(), 1);
        assert_eq!(result.entries[0].game_name, "Chrono Trigger");
        assert_eq!(result.entries[0].emulator, "RetroArch");
        assert_eq!(fs::read(&save).unwrap(), before);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn bundle_round_trip_verifies_and_restores() {
        let root = temp_dir("source");
        let save_dir = root.join("mGBA/saves");
        fs::create_dir_all(&save_dir).unwrap();
        let save = save_dir.join("Golden_Sun.sav");
        fs::write(&save, b"party-level-42").unwrap();
        let bundle = root.join("trip.rspbundle");
        create_bundle(
            root.to_string_lossy().into(),
            vec![save.to_string_lossy().into()],
            bundle.to_string_lossy().into(),
            Some("Deck to laptop".into()),
        )
        .unwrap();
        let target = temp_dir("target");
        let plan = inspect_bundle(
            bundle.to_string_lossy().into(),
            target.to_string_lossy().into(),
        )
        .unwrap();
        assert_eq!(plan.items.len(), 1);
        let summary = import_bundle(
            bundle.to_string_lossy().into(),
            target.to_string_lossy().into(),
            false,
        )
        .unwrap();
        assert_eq!(summary.restored_count, 1);
        assert_eq!(
            fs::read(target.join("mGBA/saves/Golden_Sun.sav")).unwrap(),
            b"party-level-42"
        );
        assert!(import_bundle(
            bundle.to_string_lossy().into(),
            target.to_string_lossy().into(),
            false,
        )
        .is_err());
        fs::write(target.join("mGBA/saves/Golden_Sun.sav"), b"older-save").unwrap();
        let replaced = import_bundle(
            bundle.to_string_lossy().into(),
            target.to_string_lossy().into(),
            true,
        )
        .unwrap();
        assert_eq!(replaced.restored_count, 1);
        assert_eq!(
            fs::read(target.join("mGBA/saves/Golden_Sun.sav")).unwrap(),
            b"party-level-42"
        );
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(target).unwrap();
    }

    #[test]
    fn rejects_unsafe_bundle_paths() {
        assert!(safe_relative("../../escape.sav").is_err());
        assert!(safe_relative("safe/game.sav").is_ok());
    }
}
