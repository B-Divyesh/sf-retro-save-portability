# Retro Save Portability

Retro Save Portability moves save files between computers, handhelds, launchers, and emulators.

It is for people returning to legally owned games before changing their setup. You choose every source folder and restore destination.

The app does not distribute games or BIOS files. It does not emulate games or bypass access controls.

## What version 0.1.1 does

- Scans a selected folder without changing its files.
- Recognises 15 save extensions and 11 emulator folder families.
- Records SHA-256, timestamp, size, source path, format, and emulator evidence.
- Skips recognised files larger than 128 MiB.
- Creates a deflated `.rspbundle` ZIP with selected saves and a readable JSON manifest.
- Shows emulator, uncertainty, and replacement warnings before restore.
- Rejects unsafe paths, duplicate paths, unsupported formats, bad sizes, and bad hashes.
- Keeps save processing on the device.

See the [emulator notes](site/help/index.html) for format limits.

## Try the sample project

Open the [web demo](https://retro-save-portability.sociobot.in/demo/) or select **Try it with sample data** on the landing page.

The sample contains three save records. Its state uses the `demo:retro-save-portability:sample` browser-storage key.

The desktop first screen also has **Load sample project**. Its state uses `demo:retro-save-portability:desktop`.

**Reset demo** reloads the sample. **Start for real** removes demo state before returning to the folder picker or download.

## Run locally

Requirements are Node.js 22+, Rust stable, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS.

```sh
npm ci
npm run dev          # app webview at http://localhost:1420
npm run tauri dev    # native desktop app
```

The browser app view cannot scan folders. Native folder access starts only after you use a Tauri folder dialog.

## Test and build

From a clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Every public claim and its exact command are listed in [`.factory/claims.json`](.factory/claims.json).

`npm run build` creates `dist/app` and `dist/site`. Tauri embeds `dist/app`.

The static deployment command is:

```sh
npm run build:site
/opt/fleet/lib/deploy-static.sh retro-save-portability dist/site
```

## Install

The [landing page](https://retro-save-portability.sociobot.in/) detects your operating system. It reads the latest release through GitHub’s CORS-enabled API.

Successful release details are cached for one hour. Missing or unavailable release details show a direct GitHub Releases link.

```sh
# Linux or macOS
curl -fsSL https://retro-save-portability.sociobot.in/install.sh | sh

# Windows PowerShell
irm https://retro-save-portability.sociobot.in/install.ps1 | iex
```

The shell installer checks SHA-256 before installation. Releases provide macOS ARM64 and Intel, Windows MSI and EXE, and Linux AppImage and DEB files.

Version 0.1.1 installers are unsigned. Review your operating system’s publisher warning before opening them.

## Bundle format

A `.rspbundle` is an ordinary ZIP. It contains `manifest.json` and a `files/` tree.

Bundle version 1 keeps paths relative to the selected source. It includes only the saves selected for export.

## Privacy and Keeper

Save work stays on the device. The app contains no telemetry or save upload.

Keeper adds reusable device labels and a local transfer history capped at 100 entries. It is a $19 one-time license.

Checkout is awaiting billing registration. Existing license tokens can still be pasted into the site or desktop app.

License verification sends only the token to `api.sociobot.in`. A valid result is cached for up to one day.

Read [Privacy](site/privacy/index.html) and [Terms](site/terms/index.html).

## Release

Push a `v*` tag or dispatch [`.github/workflows/release.yml`](.github/workflows/release.yml).

GitHub Actions tests the code and builds each platform artifact. It publishes `SHA256SUMS` and `latest.json` with the installers.

## License

MIT — see [LICENSE](LICENSE).
