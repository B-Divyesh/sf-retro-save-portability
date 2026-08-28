# Visual thesis — cassette-era zine

Retro Save Portability treats a save file like a treasured mixtape: small,
personal, easy to misplace, and worth labelling before it travels. The interface
borrows the useful parts of cassette culture—ruled labels, punched index marks,
photocopier grain and handwritten annotations—without imitating a game console
or leaning on pixel-art nostalgia. It should feel like a preservation tool made
by someone who cares about the history inside the files.

## Visual system

The product is intentionally single-mode. A warm recycled-paper ground is easier
to read during careful file work and makes status colours feel like physical
stamps rather than glowing software chrome.

| Token | Value | Purpose |
| --- | --- | --- |
| `paper` | `#F3E9D2` | primary background, like aged cassette inserts |
| `paper-deep` | `#DED0B3` | recessed rails and secondary panels |
| `ink` | `#171713` | primary text and outlines (14.8:1 on paper) |
| `ink-muted` | `#5D574A` | secondary copy (5.7:1 on paper) |
| `oxide` | `#C74428` | primary action, tape oxide/safety orange |
| `oxide-dark` | `#7D2415` | hover and accessible small accent text |
| `signal` | `#12664F` | verified/compatible stamp |
| `warning` | `#8A4D00` | review-needed stamp |
| `danger` | `#9F1F24` | incompatible/error stamp |
| `white` | `#FFFDF6` | label stock and high-contrast fields |

Typography uses two self-contained system stacks so the desktop shell never
downloads a font. Display copy is condensed with `Arial Narrow`, `Aptos Narrow`
and `Roboto Condensed` fallbacks; working copy uses `ui-monospace`, `SFMono-Regular`,
`Consolas` and monospace. The pairing reads like a bold photocopied headline over
a typewritten track list. Scale: 12, 14, 16, 20, 28, 44/64 px; body is always at
least 16 px. Numbers and hashes use tabular figures.

Spacing follows a 4 px base with 8, 12, 16, 24, 32, 48 and 72 px stops. Sections
are separated with whitespace and a single heavy rule before they are placed in
boxes. Independent saves receive label cards because each is a discrete object
that can be selected and inspected.

## Interaction grammar

- The three-step rail—**Scan / Bundle / Restore**—is always visible in the app.
  The active step resembles a cassette deck's depressed key.
- Files begin unselected. “Select compatible” is explicit; a scan never writes.
- Status is written as both a colour-coded rubber stamp and plain text.
- Primary buttons are solid oxide rectangles with a 2 px ink shadow. Pressing a
  button closes the shadow by 2 px, like a mechanical key.
- Focus is a 3 px signal-green double outline with space from the target.
- Destructive or overwrite operations name the exact destination and require a
  confirmation; exports never overwrite silently.

## Responsive intent

At 390 px, the decorative tape illustration and secondary prose are dropped,
the three-step rail becomes a compact horizontal list, and save metadata stacks.
All controls remain at least 44 px. The landing hero becomes text-first and the
download card follows immediately; detailed emulator coverage moves below it.

## Motion

Only state changes move. New scan rows enter with a 180 ms opacity/4 px lift;
pressed keys move 2 px for 80 ms; the active rail marker slides for 220 ms.
There is no ambient or looping animation. Under `prefers-reduced-motion: reduce`,
all transforms and transitions are disabled and changes use instant state plus
text announcements. Depth remains through rules, shadows and surface contrast.

## Asset plan and provenance

The hero is an original editorial still life: an unbranded translucent cassette,
two abstract handheld-save cartridges, a paper track card and an archival envelope
connected by a red thread. The image explains transfer and preservation without
implying ROMs, copyrighted games or emulation. Small UI icons are original inline
SVG built from the same square/round geometry; they are not raster assets.

Prompt sheet (used verbatim as the base art direction):

> Use case: stylized-concept. Asset type: landing-page hero illustration.
> Scene: overhead archival workbench arranged like a cassette-era independent
> zine cover. Subject: one unbranded translucent audio cassette, two small
> abstract game-save memory cartridges, a handwritten-style track-list card with
> no legible writing, and a kraft archival envelope, connected by a single red
> thread to show a safe journey. Medium: tactile cut-paper collage and risograph
> print, imperfect black ink registration, coarse halftone grain, torn paper
> edges. Composition: landscape 3:2, objects clustered right with calm negative
> paper space on the left, top-down lens. Light: soft directional desk light,
> modest real shadows. Palette: recycled cream paper, near-black ink, tape-oxide
> orange, deep verification green. No people, no screens, no game characters,
> no brands, no logos, no readable text, no watermark, no neon, no gradient,
> no glossy 3D render, no cyberpunk, no extra objects.

Generation: Azure AI Foundry factory image deployment via
`/opt/fleet/lib/gen-image.sh`, 2026-08-28. Generated imagery is original for this
product. Source PNG and prompt sidecar are retained in `assets/src/`; reviewed
exports are shipped as WebP/AVIF under 300 KB.
