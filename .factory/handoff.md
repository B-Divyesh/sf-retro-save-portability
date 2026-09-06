# Retro Save Portability v0.1.2 handoff

## Repair 2 status — PASS (2026-09-06)

Implementation SHA: `b996da94240d3930e4497d45721751b27bf2e54d`

Release tag: `v0.1.2`, resolving to the implementation SHA above

Release workflow: GitHub Actions run `34012760351`, all verify, Linux, Windows,
macOS ARM64, macOS Intel, and publish jobs passed

Static deployment: `6cf515f8-0b7c-4283-a980-25a8a8eb511c`

Live URL: https://retro-save-portability.sociobot.in

The documentation commit containing this report follows the implementation
commit. It is not tagged and does not change the released desktop image.

The earlier independent FAIL remains in `.factory/verification.md` as history.
Its three blocking findings are fixed:

1. The downloadable desktop release is now `v0.1.2`, built from the tested
   implementation SHA. The prior `v0.1.0` release and failed `v0.1.1` workflow
   are not the latest release. A clean consumer install opened the shipped app,
   loaded three sample saves, kept the demo label visible, and reached bundle
   review.
2. Live hashed JavaScript, CSS, AVIF, and WebP assets return
   `Cache-Control: public, max-age=31536000, immutable`. HTML remains short-lived.
3. `.factory/claims.json` now registers 15 public claims. Each has one uniquely
   tagged outcome test. All 15 documented commands passed independently.

## What changed

- Expanded the native safety suite to prove read-only scanning, all 15 supported
  extensions, 11 emulator-folder signals, the 128 MiB boundary, ROM/BIOS
  exclusion, bundle contents, readable manifests, hashes, overwrite approval,
  and rejection of tampering, traversal, duplicates, oversized entries,
  unsupported formats, and escaping symlinks.
- Added release-manifest and installer-consumer tests. The installer is exercised
  with mismatched and valid checksums in isolated directories.
- Added desktop and web sample outcome checks. They cover three populated saves,
  persistent demo labeling, bundle review, reset, leaving demo mode, and a real
  storage sentinel that remains untouched.
- Disabled Keeper storage access inside the desktop demo. Demo state uses only
  the documented `demo:retro-save-portability:*` namespace.
- Added privacy checks for the website, web demo, and desktop sample flow.
- Added a production-format Static Web Apps test server so cache and 404 behavior
  are asserted from HTTP responses.
- Rewrote public copy in plain task language, removed broken checkout links,
  added real product screenshots, and completed route titles, social artwork,
  legal pages, and the designed 404 response.
- Kept the $19 one-time Keeper deliverable and license restore path. Public copy
  states that checkout awaits billing registration.

## Clean verification

The documented Linux Tauri packages were installed first:

```sh
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
npm ci
npm test
npm run build
npm run test:e2e
```

Results on 2026-09-06:

- `npm test`: 15 claim registrations validated, 8 Vitest outcomes passed, and 7
  Rust tests passed.
- A deliberately cold Rust target rebuild also passed the unit suite in 150.36
  seconds. This reproduced and fixed the original CI worker-heartbeat failure.
- `npm run build`: passed TypeScript checks and produced `dist/app` and
  `dist/site`.
- `npm run test:e2e`: 33 passed and one intentional mobile-only project skip.
  It covers desktop and 390 px layouts, keyboard focus, reduced motion, axe,
  route titles, demo isolation, privacy, cache responses, and HTTP 404 behavior.
- Every `test` command in `.factory/claims.json` was run separately and passed.
- Initial site JavaScript is 1.89 KB gzip and CSS is 3.63 KB gzip. The mobile
  hero AVIF is 19.5 KB.
- Live Lighthouse 13.4.1 mobile scores: Performance 99, Accessibility 100, Best
  Practices 100, SEO 100. FCP was 1.16 s, LCP 1.92 s, TBT 45 ms, and CLS 0.
- Factory `verify-url.sh`: HTTPS 200, 936 ms network-idle load, no console errors,
  one `h1`, `lang=en`, a main landmark, complete image alt text, and no unlabeled
  buttons.
- Live Playwright axe checks found zero violations on home, demo, privacy, terms,
  and emulator-notes pages at desktop and phone sizes.
- The live site index and hashed JavaScript are byte-identical to `dist/site`.
  A crawl found no broken internal, source, or installer links. The expected
  unknown route returns HTTP 404 with the product-styled recovery page.

## Release and consumer evidence

The latest release contains:

- macOS Apple Silicon DMG
- macOS Intel DMG
- Windows MSI and NSIS EXE
- Linux AppImage and DEB
- `SHA256SUMS` and a valid six-platform `latest.json`

Downloaded checksums:

- Linux AppImage:
  `89b1d49aa118bc9b53cc92cb50f4e004ce9abc982aca7e2d337b0b9df6c320c2`
- Linux DEB:
  `7e27dd48073079bb2956b9071cb6e151b30f9204e066e9ecb6f025d7b3302c1f`

Both matched the published checksum file. The live one-line installer downloaded
and verified the AppImage into a new temporary consumer directory. That installed
artifact launched as v0.1.2 and loaded the three-save sample without touching
real files.

## Live behavior checked

- Fresh 1440 px desktop and 390 px phone sessions show the job, audience, sample
  action, and three facts before scrolling, with no horizontal overflow.
- The download button resolves through the GitHub API to a real v0.1.2 asset.
- Sample review reports three saves and 168 KB. Reset restores sample state.
  Starting for real deletes only the demo key; a real-data sentinel is unchanged.
- Home and demo produced no console or page errors. The demo made no unexpected
  third-party requests.
- Privacy, terms, and emulator-notes routes return 200 with distinct titles and
  one `h1`. Unknown routes return the intended 404 response.
- An invalid Keeper token returns HTTP 200 with `valid:false`, focuses the dialog
  close button on open, and shows a recovery message. The earlier independent
  rate-limit evidence remains 29 successful responses and 11 HTTP 429 responses
  with `Retry-After: 2` in a 40-request burst.

## Known limits

- Detection is evidence-based, not content-database matching. Unknown folders
  can be classified by extension only and are marked for review.
- Version 0.1.2 does not convert save formats or move directory-based saves such
  as Wii NAND packages. Emulator notes direct people to emulator-native tools.
- Region, revision, core, firmware, and memory-card differences cannot always be
  inferred. Users must keep the source until the destination game loads.
- The 90% second-machine pilot target still needs real-user measurement.
- Installers are unsigned. macOS and Windows may show publisher warnings.
- Billing registration is still absent. The checkout endpoint returns 404, so no
  purchase link is exposed. Free scanning, bundles, restore, and safety remain
  available; Keeper’s paid device labels and 100-entry local history are retained
  behind license verification. Offer metadata is in
  `.factory/billing-offer.json` and `/work/.evidence/billing-offer.json`.

## Needs operator action

1. Register the exact offer in `.factory/billing-offer.json`: Keeper, USD 19.00,
   one-time, returning to
   `https://retro-save-portability.sociobot.in/?license={token}`.
2. Add platform-signing credentials only when signed distribution is required.
   The workflow documents the expected Apple and Windows secret names; no secret
   is present in this repository.

## Deployment

Build and deploy only the static site:

```sh
npm run build:site
/opt/fleet/lib/deploy-static.sh retro-save-portability dist/site
```

The desktop release is built only by the tag-triggered GitHub Actions workflow.
