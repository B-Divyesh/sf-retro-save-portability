# Independent verification — FAIL

**Verified:** 2026-08-28
**Candidate:** `67f3e11662c7ca7ba757c7beb46da5f26907f256`
**Live URL:** https://retro-save-portability.sociobot.in

## Release decision

**FAIL.** The static site is the exact candidate build, but the released desktop
installer is not. In addition, production does not apply the required immutable
cache policy and the claims registry omits many user-reliant public claims.

## First-read result — PASS

A cold visit clearly says what it does: “Move retro saves safely.” It identifies
the audience and situation: people changing emulators or computers who need to
identify save files before moving them. The first action is the visible
**Try it with sample data** link, with “See a prepared transfer desk.” beside
it. One click opens `/demo/`, showing three realistic sample saves, the persistent
“Demo — sample data, nothing is saved to your real files.” banner, Reset demo,
and Start for real.

## Required claim tests

The required registry exists and has five entries. Per the instruction ordering,
I first invoked its first command before dependencies were installed; it could
not resolve `@playwright/test` from a clean checkout. After the standard clean
install (`npm ci`, 104 packages, 0 vulnerabilities), every command declared in
the registry passed on both Chromium desktop and the 390 px project:

| Claim | Exact command | Evidence |
| --- | --- | --- |
| `release-api-cache` | `npm run test:e2e -- --grep @claim:release-api-cache` | 2 passed |
| `published-download-state` | `npm run test:e2e -- --grep @claim:published-download-state` | 2 passed |
| `demo-sandbox` | `npm run test:e2e -- --grep @claim:demo-sandbox` | 2 passed |
| `demo-privacy` | `npm run test:e2e -- --grep @claim:demo-privacy` | 2 passed |
| `desktop-sample-project` | `npm run test:e2e -- --grep @claim:desktop-sample-project` | 2 passed |

The complete `npm run test:e2e` run records `test-results/.last-run.json` with
`{"status":"passed","failedTests":[]}` (22 tests). A fresh live `/demo/`
review made only same-origin requests, wrote only
`demo:retro-save-portability:sample`, and reported “3 sample saves, 168 KB”.

## Local quality evidence

- `npm ci`: passed; 0 reported vulnerabilities.
- `npm test`: passed — 3 Vitest tests and 4 Rust tests. The first Rust attempt
  correctly exposed missing host Tauri libraries (`glib-2.0`); after installing
  the documented Linux Tauri prerequisites, the exact command passed.
- `npm run build`: passed, including `tsc --noEmit`; output is `dist/app` and
  `dist/site`. No separate lint script is present.
- Initial site JS is 1,912 bytes gzip; site CSS is 3,532 bytes gzip. The 768 px
  hero AVIF is 19,543 bytes. All are within the stated static budgets.
- Independent Lighthouse against the production build: Performance 100,
  Accessibility 100, Best Practices 100, SEO 100; FCP/LCP 1.2 s, TBT 0 ms,
  CLS 0.
- Live desktop and 390 px browser checks: one `main`, one `h1`, `lang=en`,
  correct title, no horizontal overflow at 390 px, no console/page errors,
  no axe serious/critical findings, and a 3 px green double-outline skip-link
  focus state. The license dialog initially focuses its Close button; an invalid
  token recovers with “That license is not active. Check the token and try again.”
- Reduced-motion was requested in the independent browser context; no error or
  accessibility regression occurred. The source contains the corresponding
  `prefers-reduced-motion` path.
- Live `/demo/` has no third-party request. The landing makes the expected
  CORS-enabled GitHub Releases API request; no browser errors result.
- `/`, `/demo/`, `/privacy/`, `/terms/`, `/help/`, and `/404` returned 200.
  Live response headers include HTTPS/HSTS, CSP, `nosniff`, Referrer-Policy and
  Permissions-Policy.
- The same invalid license verification endpoint returned 200/`valid:false`.
  A 40-request burst yielded 29×200 and 11×429; 429 responses carried
  `Retry-After: 2`, so rate limiting was observed at roughly 30 rapid requests.
- The published Linux AppImage installed into an isolated temporary directory
  through `public/install.sh`; its SHA-256 was verified as
  `5c6fd0bb752400f9ea7bd7d3a848d94b25d86bf547c6d2c168bd7851977ab143`.
  The Linux DEB independently matched `SHA256SUMS`:
  `ed184aa8243ea2df97fad43a05742b3b172246211625cd483b95d3d6920b1694`.

## Live identity

The live static files byte-match this candidate’s fresh `dist/site` build:
`index.html`, `demo/index.html`, landing/demo/style/shared JS, and the hero AVIF
all had equal SHA-256 values. This confirms the custom-domain static deployment
contains the candidate site revision.

## Release-blocking defects

### Critical — released desktop app is stale relative to the candidate

The only release is `v0.1.0`, whose annotated tag resolves to
`f1f41173b7031870504352181ed35a2b23ff02ee`, not the tested candidate
`67f3e116…`. `git diff f1f4117..67f3e11 -- src/main.ts` shows that the candidate
adds the desktop **Load sample project**, demo banner, reset/start-real controls,
and isolated `demo:retro-save-portability:desktop` behavior. Thus the download
linked from the live candidate cannot be verified to contain the candidate’s
desktop sample-project feature. The local browser preview proves source behavior;
it does not make the published AppImage/DMG/MSI/DEB candidate artifacts.

**Fix:** build, tag, and publish installers from the candidate (or a subsequent
commit) for all platforms; publish new checksums/latest metadata; then verify
the downloadable artifact contains the desktop sample flow.

### High — immutable asset cache policy is absent in production

`public/_headers` requests `Cache-Control: public, max-age=31536000, immutable`
for `/assets/*`, but live
`/assets/index-DVeUVU-D.js` returns `cache-control: public, must-revalidate,
max-age=30`. The same short cache policy is returned for the HTML. This misses
the required long-lived immutable caching for hashed assets and causes needless
repeat transfers.

**Fix:** correct the deployed static-host header configuration and recheck the
custom domain until hashed `/assets/*` returns `max-age=31536000, immutable`.

### High — claims registry is incomplete for public promises

The claims contract requires every visitor-reliant claim on the live landing page
and README to have a registry entry and observable demo test. The five entries
cover release metadata and demo isolation only. Unregistered examples include
“Read-only scan”, “never alters the source”, “SHA-256 fingerprint”, “Hashes are
checked before a single save is restored”, “No telemetry”, “No cloud upload”,
the README’s “14 save extensions”, 128 MB cap, supported-emulator list, bundle
format, restore defenses, and daily license-verification behavior. The contract
states that any such unlisted claim fails review until it is removed or tested.

**Fix:** add one observable, tagged demo/desktop test per retained claim (with
boundary assertions for the 128 MB cap and restore safety), or reduce the copy
to claims that are registered and demonstrably tested.

## Non-blocking observations

- The previous deployment-only GitHub release-metadata issue is not reproduced:
  the live page uses `api.github.com`, succeeds without a console CORS error,
  and its unavailable-release test passes.
- No application sign-in exists, so the Entra tenant requirement is not
  applicable. No PWA/service worker is shipped, so offline-update checks are
  not applicable.
