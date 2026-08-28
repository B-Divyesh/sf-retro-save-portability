# Retro Save Portability v0.1 handoff

## Repair 1 — release metadata and demo compliance (2026-08-28)

- Reproduced the deployed-site defect: the old request to
  `github.com/.../releases/latest/download/latest.json` responds with a 302
  download redirect without `Access-Control-Allow-Origin`, while the GitHub
  Releases API responds with `Access-Control-Allow-Origin: *`.
- Replaced that browser fetch with
  `https://api.github.com/repos/B-Divyesh/sf-retro-save-portability/releases/latest`.
  Successful metadata is cached in `localStorage` as `rsp:latest-release:v1`
  for one hour. Installer buttons now resolve `browser_download_url` assets from
  the API; they may navigate to GitHub but are never fetched as page data.
- Missing release, rate-limit, malformed response, storage failure, and offline
  paths are caught and render “Downloads are being published” plus the direct
  GitHub Releases page. No exception escapes the release loader.
- Added `/demo/`, a three-save sample transfer desk with persistent demo banner,
  reset, and start-for-real actions. It uses only
  `demo:retro-save-portability:sample`; the desktop first-run view now also has
  **Load sample project** under `demo:retro-save-portability:desktop`.
- Added `.factory/claims.json`, `.factory/demo.md`, and `.factory/copy-audit.md`.
  The landing first screen now uses plain, job-focused copy and links straight to
  the sample data. Added canonical/OG/Twitter metadata, static-web-app headers,
  a 404 page, demo sitemap entry, and the CORS API CSP allowance.

### Repair verification

Run from a clean checkout:

```sh
npm ci
npm run build
npm test
npm run test:e2e
```

Verified on 2026-08-28:

- `npm run build`: passed. `dist/app` and `dist/site` produced. Landing JavaScript
  is 1.89 KB gzip; demo JavaScript is 0.70 KB gzip; site CSS is 3.53 KB gzip.
- `npm test`: passed — 3 Vitest tests and 4 Rust core tests.
- `npm run test:e2e`: passed — 21 passed, 1 intentional project skip. Chromium
  desktop and 390px mobile cover keyboard interaction, no-overflow mobile
  layout, axe serious/critical checks, title/lang/main/h1/alt, console-free
  successful release loading, API-cache behaviour, unavailable-release fallback,
  desktop sample project, isolated demo storage, and demo third-party-network
  privacy.
- Every entry in `.factory/claims.json` was run individually with its listed
  Playwright grep command and passed for desktop and mobile.
- Live identity check: GitHub API `releases/latest` returned 200 with
  `access-control-allow-origin: *`; the previous latest-download endpoint
  returned a 302 redirect and no CORS response header, confirming the root cause.

### Repair deployment

The exact static deployment command remains `npm run build:site`, publishing
`dist/site`. Deployment configuration is repository-static (`public/_headers`
and `public/staticwebapp.config.json`). The factory static deployment completed
on 2026-08-28 as deployment `841a0965-e97d-4710-9a61-44ae8058469d` to
`https://nice-pond-01751cc10.7.azurestaticapps.net`, with the production custom
domain returning HTTPS 200. Final `verify-url.sh` evidence: load 670 ms, zero
browser errors, title/lang/main/h1/alt all present, and zero unlabeled buttons.

## What shipped

- Tauri 2 desktop app with a Rust-only filesystem boundary and responsive vanilla
  TypeScript UI.
- Read-only detection for 14 hardware-save extensions, 11 emulator folder
  families, timestamps, sizes, format labels, confidence, and SHA-256 hashes.
- Portable `.rspbundle` ZIP export with versioned JSON manifest, original relative
  paths, an optional transfer note, and no ROM/BIOS collection.
- Restore preflight that calls out unknown formats/emulators and exact overwrite
  destinations before writing. Restore checks size and SHA-256, rejects traversal,
  duplicate, oversized, and symlink-escape paths, and uses a rollback backup for
  replacements.
- Optional $19 Keeper unlock via the Sociobot billing API, including paste-to-
  restore licensing, daily verification cache, reusable local device label, and
  a 100-entry local transfer journal. Core preservation and safety remain free.
- Cassette-era zine interface, original generated hero artwork, responsive AVIF
  and WebP derivatives, a custom app icon, legal pages, compatibility field guide,
  OS-detected downloads, and checksum-verifying shell/PowerShell installers.
- GitHub Actions release matrix for macOS ARM64/Intel DMG, Windows MSI/NSIS, and
  Linux AppImage/DEB; publishing also produces `SHA256SUMS` and `latest.json`.

## Run and verify

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

The static deploy command is exactly `npm run build:site`; output is
`dist/site/index.html`. Tauri embeds `dist/app`.

Verified locally on 2026-08-28:

- `npm test`: 3 Vitest tests and 4 Rust core tests passed.
- `npm run build`: passed; app JS 16.69 KB and CSS 9.89 KB, landing JS 4.24 KB
  and CSS 11.06 KB (uncompressed), all under budget.
- `npm run test:e2e`: 11 passed, 1 intentional project skip; landing, app shell,
  help, privacy, and terms audited with axe in Chromium at desktop and 390 px;
  no serious/critical findings and no horizontal overflow.
- Lighthouse 12.8.2, mobile profile against the production build: Performance
  100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.2 s,
  TBT 0 ms, CLS 0.
- Hero assets: 768 px AVIF 20 KB / WebP 48 KB; 1280 px AVIF 76 KB / WebP
  156 KB. Source, prompt, review, and provenance are in `assets/src/` and
  `.factory/design.md`.
- Release workflow run `33156187991`: all four build jobs and the publish job
  passed. The v0.1.0 release contains both macOS DMGs, Windows MSI/EXE, Linux
  AppImage/DEB, `SHA256SUMS`, and valid six-platform `latest.json`. Independently
  downloaded and verified the Linux DEB at SHA-256
  `ed184aa8243ea2df97fad43a05742b3b172246211625cd483b95d3d6920b1694`.

## Known gaps

- Detection is intentionally evidence-based, not content-database matching. An
  unfamiliar folder can be classified only by extension and is marked “review”.
- v0.1 does not convert formats or move directory-based saves such as PPSSPP or
  Wii NAND packages. The field guide sends users to emulator-native tools.
- Region, game revision, core, firmware, and memory-card-layout incompatibilities
  cannot always be inferred from a save file. The product never promises a match.
- The 90% second-machine pilot restore target needs real-user measurement after
  release; automated round trips pass for detected saves.

## Needs operator action

1. Register `retro-save-portability` in the Sociobot billing engine with a $19
   one-time Keeper price and return URL
   `https://retro-save-portability.sociobot.in/?license={token}`.
2. Deploy `dist/site` at the product hostname after the release is published.
3. Current v0.1 installers are deliberately unsigned. For signed builds, add the
   Apple signing/notarisation step using `APPLE_CERTIFICATE`,
   `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`,
   `APPLE_PASSWORD`, and `APPLE_TEAM_ID`; add the Windows certificate import/sign
   step using `WINDOWS_CERT_PFX` and `WINDOWS_CERT_PASSWORD`. These secrets are not
   present or required by the unsigned workflow.
4. Keep the source folders until the destination emulator has loaded each save.
   This warning is already present in the UI and documentation.
