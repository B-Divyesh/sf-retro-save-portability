# Verify moving retro saves between computers — FAIL

**Verified:** 2026-09-06  
**Implementation candidate:** `3f2a55e5fe39c4f446fe8b0dbc755fd11a81653e`  
**Documentation checkout:** `b7be0a2f010e219a6b913f143aff853c4f29ffb4`  
**Release:** `v0.1.3`, resolving to the implementation candidate  
**Live URL:** https://retro-save-portability.sociobot.in

## Verdict

**FAIL — 4 findings and 5 untested public claims.**

All 15 commands declared in `.factory/claims.json` passed. The release is the
right candidate, the demo and installed Linux app work, immutable caching is
live, and the previous release blockers are mostly fixed. Acceptance still
requires zero findings and zero untested claims.

## First screen before scrolling

Fresh 1440 × 900 desktop and 390 × 844 phone contexts gave the same clear read:

- Job: **Move retro saves safely.**
- Audience: people changing emulators or computers who need to identify save
  files before moving them.
- First action: **Try it with sample data**, followed by “See three prepared
  save records.”

The job, audience, and sample action were visible without scrolling at both
sizes. The phone layout had no horizontal overflow. The desktop’s last short
fact met the viewport edge, but its text remained readable.

## Findings

### High — the promised desktop license-removal control is absent

The live Privacy page says, “Remove the desktop license from the Keeper panel.”
The released app has no such action. Its active Keeper panel can save a device
label and clear transfer history, but it cannot remove the license. Although
`src/license.ts` exports `clearLicense`, `src/main.ts` neither imports it nor
renders or binds a license-removal control. The unit test calls the helper
directly and therefore does not prove the promised user path.

This is a false privacy instruction. Add a clearly labelled removal action in
the desktop Keeper panel, clear both token and cached verdict, return the app to
free mode, and cover the complete UI outcome with a claim test.

### High — five public claims have no complete declared outcome test

The registry now covers the earlier scan, bundle, restore, privacy, demo,
release, and Keeper gaps, but it is still incomplete. These public promises are
not named and fully exercised by any `.factory/claims.json` entry:

1. The landing page says the app works without an account or continuous
   internet access. The network test runs a browser preview from a local HTTP
   server; it does not launch the installed app with networking unavailable.
2. The README says the page detects the visitor’s operating system. The browser
   test uses Linux Chromium in both projects and does not exercise macOS,
   Windows, and fallback detection branches.
3. The landing page, README, and Terms say the platform installers are unsigned.
   No declared command inspects the published macOS and Windows signatures.
4. The Privacy page says removing the app does not delete bundles. No uninstall
   or bundle-retention test exists.
5. The landing page, app, and Terms say scanning, bundles, restore, export,
   accessibility, and safety remain free. No claim test proves the complete
   feature set remains available without a valid Keeper license.

The independently launched AppImage did work without an account and opened no
network socket, but that one manual Linux check does not satisfy the required
repeatable, cross-platform claim coverage.

### Medium — phone link targets are smaller than 44 px

Computed hit areas in a fresh 390 px touch context are below the required 44 ×
44 CSS px minimum:

- Home footer: Demo 29 × 19, Privacy 50 × 19, Terms 36 × 19, Source 43 × 19.
- Home and demo wordmarks are 32 px high.
- Privacy and Terms support links are 18 px high; their footer links are 25 px
  high.
- The designed 404’s Return home link is 106 × 19; its footer links are 26 px
  high.

The links are visually legible and keyboard-focusable, but the touch areas do
not meet the attached accessibility and site-structure contracts.

### Low — secondary routes omit required social metadata

`/demo/`, `/privacy/`, `/terms/`, and `/help/` have route-specific titles,
descriptions, and canonical URLs, but none includes Open Graph or Twitter card
metadata. The site-structure contract requires that metadata and the product’s
real 1200 × 630 image. The home route has the complete set.

## Declared claim commands

The checkout was cloned fresh at the documentation SHA. Node 22.23.2, npm
10.9.8, and Rust 1.98.0 were present. The documented Tauri Linux packages were
not preinstalled, so they were installed before measurement. `npm ci` then
installed 103 packages with zero reported vulnerabilities.

Every command was invoked separately and passed:

| Claim | Result |
| --- | --- |
| `immutable-assets` | PASS — 2 browser projects |
| `release-api-cache` | PASS — 2 browser projects |
| `published-download-state` | PASS — 2 browser projects |
| `release-manifest` | PASS — 1 outcome |
| `installer-checksum` | PASS — 1 outcome |
| `demo-sandbox` | PASS — 2 browser projects |
| `demo-privacy` | PASS — 2 browser projects |
| `website-privacy` | PASS — 2 browser projects |
| `desktop-sample-project` | PASS — 2 browser projects |
| `app-network-privacy` | PASS — 2 browser projects |
| `native-scan` | PASS — 1 outcome; cold helper build took 148.7 s |
| `native-bundle` | PASS — 1 outcome |
| `native-restore` | PASS — 1 outcome |
| `license-verification` | PASS — 1 outcome |
| `keeper-local-features` | PASS — 1 outcome |

Each claim ID occurs exactly once in the test source.

## Clean quality gates

- `npm test`: PASS — 15 registrations, 8 Vitest outcomes, and 7 Rust tests.
- `npm run build`: PASS — TypeScript, app build, and site build; output is
  `dist/app` and `dist/site`.
- `npm run test:e2e`: PASS — 33 passed and one intentional mobile-only skip.
- Site output: 6.53 KB JavaScript and 13.44 KB CSS uncompressed; initial site
  JavaScript is 1.89 KB gzip and CSS is 3.63 KB gzip.
- Live Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.06 s, LCP 1.13 s, TBT 28.5 ms, CLS 0.
- Factory URL check: 200, 790 ms network-idle load, no console errors, `lang=en`,
  one `h1`, one `main`, complete image alt text, and no unlabeled buttons.
- Live axe scans on home, demo, privacy, terms, help, and the designed 404 found
  no serious or critical violations at phone and desktop sizes. The deliberate
  navigation 404 produced the browser’s expected failed-resource console line;
  the response and recovery page were correct and are not a defect.
- All listed routes reflowed at 320 px with zero horizontal overflow. Reduced
  motion set animation and transition durations to zero.

## Live demo and recovery paths

- Fresh desktop and phone sessions entered the demo in one click.
- The populated result contained Golden Sun (32 KB), Chrono Trigger (8 KB), and
  Road trip save (128 KB), including identified and review states.
- Review reported “3 sample saves, 168 KB, with integrity labels.”
- The demo label stayed present through review and reset.
- Reset restored all three records. Start for real removed only
  `demo:retro-save-portability:sample`; `rsp:verification-2-sentinel` remained
  unchanged.
- Demo requests were same-origin. The home route contacted only the documented
  GitHub Releases API. There were no console or page errors on normal paths.
- The first Tab focused the skip link with a 3 px outline. The license dialog
  initially focused its Close button. An invalid token received HTTP 200 with
  `valid:false` and displayed a plain recovery message.
- All real site, source, and current release links returned 200 after redirects.
  The unknown route returned the intended HTTP 404 with one `h1`, one `main`, a
  route title, and Return home.

There is no product backend, account tenant, service worker, or updater, so
tenant isolation, restart persistence, backend health, 429 behavior, and PWA
update checks do not apply. The separate Sociobot billing endpoint still returns
404 because Keeper registration is the documented operator dependency; the site
does not expose a broken checkout link.

## Released desktop artifact

The annotated `v0.1.3` tag dereferences to the implementation SHA. The latest
release provides valid `latest.json`, `SHA256SUMS`, macOS ARM64 and Intel DMGs,
Windows MSI and EXE, and Linux AppImage and DEB entries.

The live shell installer was run with a new XDG install directory. It downloaded
and verified the AppImage as
`cd208feb72fce7a4e32259fab26d0c8b893a1f0f683919f33f1e683c13c2e223`,
matching both GitHub metadata and `SHA256SUMS`. The container has no FUSE device,
so the same installed AppImage was launched with AppImage’s documented
extract-and-run fallback under a fresh XDG profile.

The shipped v0.1.3 app loaded the three-save sample, displayed its demo label,
reviewed the portable bundle, reached “Demo bundle review is ready”, reset to
three saves, and returned to the clean folder-selection screen with Start for
real. Its live local-storage table was empty after leaving the demo. A separate
sentinel save retained SHA-256
`386ace4ec5aba449ba671440a0a749c156d5e6abf2d9a54fba3b15604ef81efa`
through every step. No app network socket was open.

## Live identity and earlier findings

The fresh build and live files matched byte-for-byte for home, demo, privacy,
terms, help, all three built scripts, built CSS, and the mobile AVIF/WebP hero.
Only `.factory/handoff.md` differs between implementation and documentation
commits.

| Earlier item | Current disposition |
| --- | --- |
| Critical: release was stale | Fixed. v0.1.3 resolves to `3f2a55e`; its installed app completed the sample flow. |
| High: immutable cache missing | Fixed. Live hashed JS, CSS, AVIF, and WebP return `max-age=31536000, immutable`. |
| High: only five claims registered | Improved but incomplete. Fifteen declared commands pass; the five untested public claims above remain. |
| Earlier GitHub latest-download CORS error | Fixed. The live page uses `api.github.com`, caches success, and emits no error. |
| Desktop demo left stale sample notice | Fixed. Start for real returned to a clean folder-selection screen. |
| Cold native claim could exceed the worker heartbeat | Fixed. The exact command completed from a cold target in 151.1 s overall. |
| No PWA or application sign-in | Still not applicable; neither is promised. |
| Keeper checkout and signing | Still documented operator dependencies. Checkout returns 404 and no buy link is exposed; installers are disclosed as unsigned. |

## Evidence

Fresh-checkout output, live screenshots, the Lighthouse JSON, installed-app
screenshots, and the factory URL check are under `/work/.evidence/live-verify/`.
The required report copy is `/work/.evidence/qa-report.md`.
