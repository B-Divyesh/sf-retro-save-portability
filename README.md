# Retro Save Portability

Retro Save Portability is a local-first desktop utility for people moving legally
owned old games between computers, handhelds, launchers, and emulators. It finds
hardware saves in a folder the user selects, fingerprints them, creates a portable
`.rspbundle`, and warns about emulator or overwrite risks before restoring.

It does **not** distribute ROMs or BIOS files, emulate games, defeat DRM, upload
saves, or treat emulator save states as portable hardware saves.

## What v0.1 does

- Read-only recursive scan for 14 save extensions, capped at 128 MB per file.
- Folder-based identification for RetroArch, DuckStation, PCSX2, Dolphin, mGBA,
  VisualBoyAdvance, DeSmuME, melonDS, Snes9x, PPSSPP, and BizHawk.
- SHA-256, timestamp, size, source path, format, and confidence per save.
- Deflated `.rspbundle` with the files and a human-readable JSON manifest.
- Restore preflight with emulator mismatch, uncertainty, and overwrite warnings.
- Hash and size verification, path traversal/symlink defenses, and recoverable
  same-folder replacement before each restored file is committed.
- Optional $19 Keeper license for local device labels and a transfer journal.
  The preservation, export, restore, safety, and accessibility features are free.

See [the emulator field guide](site/help/index.html) for known limitations.

## Run locally

Requirements: Node.js 22+, Rust stable, and the [Tauri 2 system
dependencies](https://v2.tauri.app/start/prerequisites/) for your OS.

```sh
npm ci
npm run dev          # webview UI at http://localhost:1420
npm run tauri dev    # native desktop shell
```

The browser version of the app UI deliberately does not scan folders; real file
access is available only through Tauri’s native, user-initiated dialogs.

## Test and build

```sh
npm test             # Vitest plus Rust core tests
npm run test:e2e     # Playwright + axe at desktop and 390 px
npm run build        # app UI -> dist/app; landing -> dist/site
npm run build:site   # exact static deploy command -> dist/site
```

`dist/site/index.html` is the static deployment root. `dist/app` is embedded by
Tauri. No platform installers are built in the factory worker; the release
workflow builds them on GitHub’s macOS, Windows, and Linux runners.

## Install

The landing page at <https://retro-save-portability.sociobot.in> detects the OS
and reads the checksum manifest from the latest GitHub release.

```sh
# Linux or macOS (downloads and verifies SHA-256 first)
curl -fsSL https://retro-save-portability.sociobot.in/install.sh | sh

# Windows PowerShell
irm https://retro-save-portability.sociobot.in/install.ps1 | iex
```

Releases include macOS ARM64/Intel DMGs, Windows MSI/NSIS installers, and Linux
AppImage/DEB packages. v0.1 installers are unsigned: on macOS, right-click the app
and choose **Open**; on Windows, review the publisher warning. Always compare the
asset against `SHA256SUMS`.

## Bundle format

`.rspbundle` is an ordinary ZIP containing `manifest.json` and a `files/` tree
that preserves paths relative to the chosen source. Bundle version 1 records no
ROM metadata or file contents beyond the explicitly selected saves.

## Privacy and licensing

Scans, saves, manifests, device labels, and journal entries stay local. There is
no telemetry or analytics. Keeper verification sends only the locally stored
license token to `api.sociobot.in`, at most daily when cached. Purchases use the
Sociobot billing API; no payment provider is embedded here. See
[Privacy](site/privacy/index.html) and [Terms](site/terms/index.html).

## Release

Tag `v*` or manually dispatch `.github/workflows/release.yml`. It runs the Tauri
matrix, normalises artifacts, computes `SHA256SUMS`, creates `latest.json`, and
publishes everything through a GitHub Release.

## License

MIT — see [LICENSE](LICENSE).
