import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { cachedLicenseValid, captureLicenseFromUrl, storeLicense, verifyLicense } from "./license";
import "./styles.css";

interface SaveEntry {
  id: string;
  path: string;
  relativePath: string;
  fileName: string;
  gameName: string;
  extension: string;
  formatLabel: string;
  emulator: string;
  size: number;
  modified: string | null;
  sha256: string;
  confidence: string;
}

interface ScanResult {
  root: string;
  scannedFiles: number;
  skippedFiles: number;
  entries: SaveEntry[];
  warnings: string[];
}

interface ImportItem {
  entry: SaveEntry;
  destination: string;
  status: "compatible" | "warning" | "overwrite";
  message: string;
}

interface ImportPlan {
  bundlePath: string;
  targetRoot: string;
  createdAt: string;
  note: string | null;
  items: ImportItem[];
  compatibleCount: number;
  warningCount: number;
  overwriteCount: number;
}

type Step = "scan" | "bundle" | "restore";
interface JournalEntry { date: string; action: "bundle" | "restore"; count: number; location: string; device: string; }
const JOURNAL_KEY = "rsp:keeper-journal";
const DEVICE_KEY = "rsp:keeper-device";
const DEMO_KEY = "demo:retro-save-portability:desktop";

const sampleScan: ScanResult = {
  root: "Demo sample folder (no files on your device)", scannedFiles: 3, skippedFiles: 0, warnings: [],
  entries: [
    { id: "demo-golden-sun", path: "demo:GoldenSun.sav", relativePath: "mGBA/saves/GoldenSun.sav", fileName: "GoldenSun.sav", gameName: "Golden Sun", extension: "sav", formatLabel: "Native battery save", emulator: "mGBA", size: 32768, modified: "2026-08-28T08:00:00Z", sha256: "a".repeat(64), confidence: "high" },
    { id: "demo-chrono", path: "demo:chrono.srm", relativePath: "RetroArch/saves/chrono.srm", fileName: "chrono.srm", gameName: "Chrono Trigger", extension: "srm", formatLabel: "Battery save", emulator: "RetroArch", size: 8192, modified: "2026-08-27T20:12:00Z", sha256: "b".repeat(64), confidence: "high" },
    { id: "demo-road-trip", path: "demo:slot-01.sav", relativePath: "Imported/slot-01.sav", fileName: "slot-01.sav", gameName: "Road trip save", extension: "sav", formatLabel: "General save", emulator: "Unknown emulator", size: 131072, modified: "2026-08-21T14:25:00Z", sha256: "c".repeat(64), confidence: "review" }
  ]
};

const state: {
  step: Step;
  scan: ScanResult | null;
  selected: Set<string>;
  plan: ImportPlan | null;
  busy: boolean;
  notice: { kind: "success" | "error" | "info"; text: string } | null;
  pro: boolean;
  demo: boolean;
} = {
  step: "scan",
  scan: null,
  selected: new Set(),
  plan: null,
  busy: false,
  notice: null,
  pro: cachedLicenseValid(),
  demo: false
};

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("App root is unavailable");
const app: HTMLDivElement = appElement;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] || character);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dateLabel(value: string | null): string {
  if (!value) return "Date unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function setNotice(kind: "success" | "error" | "info", text: string): void {
  state.notice = { kind, text };
  render();
}

function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function rail(): string {
  const steps: Array<[Step, string, string]> = [
    ["scan", "1", "Scan"], ["bundle", "2", "Bundle"], ["restore", "3", "Restore"]
  ];
  return `<nav class="step-rail" aria-label="Save transfer steps"><ol>${steps.map(([id, number, label]) => `
    <li class="${state.step === id ? "active" : ""}">
      <button type="button" data-step="${id}" aria-current="${state.step === id ? "step" : "false"}">
        <span aria-hidden="true">${number}</span>${label}
      </button>
    </li>`).join("")}</ol></nav>`;
}

function scanView(): string {
  if (!state.scan) {
    return `<section class="empty-state" aria-labelledby="scan-title">
      <div class="tape-mark" aria-hidden="true"><span></span><span></span></div>
      <p class="eyebrow">Read-only first pass</p>
      <h2 id="scan-title">Find the progress worth carrying.</h2>
      <p>Choose an emulator or saves folder. We look for known save formats, identify likely emulators, and fingerprint every match. Nothing is changed.</p>
      <div class="action-row"><button class="primary" type="button" id="choose-folder" ${state.busy ? "disabled" : ""}>${state.busy ? "Scanning…" : "Choose save folder"}</button><button class="secondary" type="button" id="load-sample">Load sample project</button></div>
      ${!isTauri() ? `<p class="inline-note">Folder scanning is available inside the desktop app. This browser view is a layout preview only.</p>` : ""}
      <details><summary>What gets scanned?</summary><p>Battery saves and memory-card files such as .srm, .sav, .dsv, .mcr, .gci and related sidecars. ROMs and BIOS files are ignored.</p></details>
    </section>`;
  }
  const saves = state.scan.entries;
  return `<section aria-labelledby="results-title">
    <div class="section-heading"><div><p class="eyebrow">Read-only scan complete</p><h2 id="results-title">${saves.length} ${saves.length === 1 ? "save" : "saves"} found</h2><p class="path">${escapeHtml(state.scan.root)}</p></div>
      <button class="secondary" type="button" id="choose-folder">Scan another folder</button></div>
    ${saves.length ? `<div class="selection-bar"><label><input id="select-all" type="checkbox" ${state.selected.size === saves.length ? "checked" : ""}> Select all detected saves</label><strong>${state.selected.size} selected</strong></div>
      <ul class="save-list">${saves.map(entry => `<li>
        <label class="save-card"><input type="checkbox" data-save="${entry.id}" ${state.selected.has(entry.id) ? "checked" : ""}>
          <span class="save-main"><strong>${escapeHtml(entry.gameName)}</strong><span>${escapeHtml(entry.fileName)} · ${formatBytes(entry.size)}</span></span>
          <span class="save-meta"><span class="stamp ${entry.confidence === "high" ? "ok" : "warn"}">${entry.confidence === "high" ? "identified" : "review"}</span><span>${escapeHtml(entry.emulator)}</span><span>${escapeHtml(entry.formatLabel)}</span><time>${dateLabel(entry.modified)}</time></span>
          <code title="Full SHA-256">${entry.sha256.slice(0, 12)}…</code>
        </label></li>`).join("")}</ul>
      <div class="action-row"><button class="primary" type="button" id="continue-bundle" ${state.selected.size === 0 ? "disabled" : ""}>Review portable bundle</button><span>No files will move yet.</span></div>`
      : `<div class="empty-inline"><strong>No supported saves were found.</strong><p>Try the emulator's dedicated “saves”, “battery”, or “memory cards” folder—not the ROM library. Save states are intentionally not treated as portable hardware saves.</p></div>`}
    ${state.scan.warnings.length ? `<details class="warnings"><summary>${state.scan.warnings.length} scan warnings</summary><ul>${state.scan.warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}

function bundleView(): string {
  const selected = state.scan?.entries.filter(entry => state.selected.has(entry.id)) || [];
  if (!selected.length) return `<section class="empty-state"><p class="eyebrow">Nothing queued</p><h2>Choose saves before making a bundle.</h2><button class="primary" data-step="scan">Return to scan</button></section>`;
  const total = selected.reduce((sum, entry) => sum + entry.size, 0);
  return `<section aria-labelledby="bundle-title"><p class="eyebrow">Portable archive</p><h2 id="bundle-title">Label this bundle.</h2>
    <div class="bundle-label"><div class="bundle-count"><strong>${selected.length}</strong><span>${selected.length === 1 ? "save" : "saves"}<br>${formatBytes(total)}</span></div>
      <div><label for="bundle-note">Transfer note <span>(optional)</span></label><textarea id="bundle-note" maxlength="500" rows="3" placeholder="e.g. Living-room PC → travel laptop"></textarea><p>Stored inside the bundle, only on your devices.</p></div></div>
    <details><summary>Included saves</summary><ul class="plain-list">${selected.map(entry => `<li><strong>${escapeHtml(entry.gameName)}</strong><span>${escapeHtml(entry.relativePath)}</span></li>`).join("")}</ul></details>
    <div class="safety-strip"><strong>Integrity card included</strong><span>Every file gets a SHA-256 fingerprint. Restore checks it before writing.</span></div>
    <div class="action-row"><button class="primary" type="button" id="create-bundle" ${state.busy ? "disabled" : ""}>${state.busy ? "Packing…" : "Create .rspbundle"}</button><button class="text-button" data-step="scan">Back to saves</button></div>
  </section>`;
}

function restoreView(): string {
  if (!state.plan) return `<section class="empty-state" aria-labelledby="restore-title"><p class="eyebrow">Compatibility preflight</p><h2 id="restore-title">Open a bundle. Pick a destination.</h2><p>We inspect every save, compare the target emulator folder, flag replacements, and verify hashes before restoring.</p><button class="primary" id="open-bundle" type="button" ${state.busy ? "disabled" : ""}>${state.busy ? "Inspecting…" : "Choose bundle to restore"}</button></section>`;
  const needsReview = state.plan.warningCount + state.plan.overwriteCount > 0;
  return `<section aria-labelledby="plan-title"><p class="eyebrow">Restore preflight</p><h2 id="plan-title">Review before anything moves.</h2>
    <div class="plan-summary"><span><strong>${state.plan.compatibleCount}</strong> compatible</span><span><strong>${state.plan.warningCount}</strong> review</span><span><strong>${state.plan.overwriteCount}</strong> replace</span></div>
    <p class="path">Target: ${escapeHtml(state.plan.targetRoot)}</p>
    ${state.plan.note ? `<blockquote>“${escapeHtml(state.plan.note)}”</blockquote>` : ""}
    <ul class="restore-list">${state.plan.items.map(item => `<li><div><strong>${escapeHtml(item.entry.gameName)}</strong><span>${escapeHtml(item.destination)}</span><p>${escapeHtml(item.message)}</p></div><span class="stamp ${item.status === "compatible" ? "ok" : item.status === "overwrite" ? "danger" : "warn"}">${item.status}</span></li>`).join("")}</ul>
    ${needsReview ? `<label class="confirm"><input id="confirm-restore" type="checkbox"> I reviewed the warnings and replacement paths above.</label>` : ""}
    <div class="action-row"><button class="primary" id="run-restore" type="button" ${needsReview ? "disabled" : ""}>Restore ${state.plan.items.length} saves</button><button class="text-button" id="open-bundle">Choose another bundle</button></div>
  </section>`;
}

function proPanel(): string {
  const journal = readJournal();
  const device = localStorage.getItem(DEVICE_KEY) || "";
  return `<dialog id="license-dialog" aria-labelledby="license-title"><form method="dialog"><button class="dialog-close" value="cancel" aria-label="Close license panel">×</button><p class="eyebrow">Keeper edition</p><h2 id="license-title">${state.pro ? "License active" : "Keep a transfer journal"}</h2>
    <p>Keeper is a one-time $19 purchase. It adds reusable device labels and a local transfer journal. Scanning, verified bundles, restore, accessibility, and safety remain free.</p>
    ${state.pro ? `<p class="license-ok">✓ Keeper features are unlocked on this device.</p><label for="device-label">This device’s label</label><input id="device-label" maxlength="60" value="${escapeHtml(device)}" placeholder="e.g. Travel laptop"><button id="save-device-label" type="button" class="secondary">Save device label</button><h3>Local transfer journal</h3>${journal.length ? `<ul class="journal">${journal.slice(0, 8).map(item => `<li><strong>${item.action === "bundle" ? "Bundled" : "Restored"} ${item.count}</strong><span>${escapeHtml(item.device)} · ${dateLabel(item.date)}</span><small>${escapeHtml(item.location)}</small></li>`).join("")}</ul><button id="clear-journal" type="button" class="text-button">Clear transfer journal</button>` : `<p class="inline-note">New bundles and restores will be noted here, only on this device.</p>`}` : `<a class="primary button-link" href="https://api.sociobot.in/api/v1/products/retro-save-portability/checkout">Buy Keeper — $19 once</a><label for="license-token">Have a license? Paste it here</label><input id="license-token" autocomplete="off" spellcheck="false"><button id="restore-license" type="button" class="secondary">Verify license</button><p id="license-status" class="inline-note" aria-live="polite"></p>`}
    <p class="legal-small">Sociobot/Dodo is merchant of record. Refunds are handled there and revoke the license. <a href="https://retro-save-portability.sociobot.in/privacy">Privacy</a> · <a href="https://retro-save-portability.sociobot.in/terms">Terms</a></p></form></dialog>`;
}

function render(): void {
  app.innerHTML = `<header class="app-header"><a class="wordmark" href="#" aria-label="Retro Save Portability home"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span><span>Retro Save<br>Portability</span></a><button class="keeper-button" id="open-license" type="button">${state.pro ? "Keeper active" : "Unlock Keeper"}</button></header>
    <main id="main">${state.demo ? `<div class="demo-banner" role="status"><p>Demo — sample data, nothing is saved to your real files.</p><div class="demo-banner-actions"><button type="button" id="reset-demo">Reset demo</button><button type="button" id="start-real">Start for real</button></div></div>` : ""}<div class="intro"><p class="kicker">Save-transfer desk · v0.1</p><h1>Carry your<br><em>progress.</em></h1><p>Find hardware saves, make a verified portable bundle, and restore with compatibility warnings—before changing launchers.</p></div>${rail()}<div class="workbench">${state.notice ? `<div class="notice ${state.notice.kind}" role="${state.notice.kind === "error" ? "alert" : "status"}">${escapeHtml(state.notice.text)}<button aria-label="Dismiss message" id="dismiss-notice">×</button></div>` : ""}${state.step === "scan" ? scanView() : state.step === "bundle" ? bundleView() : restoreView()}</div></main>
    <footer><span>Local-first · No telemetry · No ROMs</span><a href="https://retro-save-portability.sociobot.in/help">Emulator notes</a></footer>${proPanel()}`;
  bindEvents();
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>("[data-step]").forEach(button => button.addEventListener("click", () => {
    state.step = button.dataset.step as Step;
    state.notice = null;
    render();
  }));
  document.querySelector("#choose-folder")?.addEventListener("click", scanFolder);
  document.querySelector("#load-sample")?.addEventListener("click", loadSampleProject);
  document.querySelector("#reset-demo")?.addEventListener("click", loadSampleProject);
  document.querySelector("#start-real")?.addEventListener("click", () => { state.demo = false; state.scan = null; state.selected.clear(); state.step = "scan"; localStorage.removeItem(DEMO_KEY); render(); });
  document.querySelector("#select-all")?.addEventListener("change", event => {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    state.selected = new Set(checked ? state.scan?.entries.map(entry => entry.id) : []);
    render();
  });
  document.querySelectorAll<HTMLInputElement>("[data-save]").forEach(input => input.addEventListener("change", () => {
    const id = input.dataset.save || "";
    input.checked ? state.selected.add(id) : state.selected.delete(id);
    render();
  }));
  document.querySelector("#continue-bundle")?.addEventListener("click", () => { state.step = "bundle"; render(); });
  document.querySelector("#create-bundle")?.addEventListener("click", createPortableBundle);
  document.querySelectorAll("#open-bundle").forEach(button => button.addEventListener("click", inspectPortableBundle));
  document.querySelector("#confirm-restore")?.addEventListener("change", event => {
    const button = document.querySelector<HTMLButtonElement>("#run-restore");
    if (button) button.disabled = !(event.currentTarget as HTMLInputElement).checked;
  });
  document.querySelector("#run-restore")?.addEventListener("click", restoreBundle);
  document.querySelector("#dismiss-notice")?.addEventListener("click", () => { state.notice = null; render(); });
  document.querySelector("#open-license")?.addEventListener("click", () => (document.querySelector<HTMLDialogElement>("#license-dialog"))?.showModal());
  document.querySelector("#restore-license")?.addEventListener("click", restoreLicense);
  document.querySelector("#save-device-label")?.addEventListener("click", () => {
    const label = document.querySelector<HTMLInputElement>("#device-label")?.value.trim() || "This device";
    localStorage.setItem(DEVICE_KEY, label);
    setNotice("success", `Device label saved as “${label}”.`);
  });
  document.querySelector("#clear-journal")?.addEventListener("click", () => {
    if (window.confirm("Clear the local Keeper transfer journal on this device? This cannot be undone.")) {
      localStorage.removeItem(JOURNAL_KEY); render();
      document.querySelector<HTMLDialogElement>("#license-dialog")?.showModal();
    }
  });
}

function readJournal(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]") as JournalEntry[]; }
  catch { return []; }
}

function addJournal(entry: Omit<JournalEntry, "date" | "device">): void {
  if (!state.pro) return;
  const current = readJournal();
  current.unshift({ ...entry, date: new Date().toISOString(), device: localStorage.getItem(DEVICE_KEY) || "Unlabelled device" });
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(current.slice(0, 100)));
}

async function scanFolder(): Promise<void> {
  if (!isTauri()) return setNotice("info", "Install the desktop app to scan folders safely.");
  const path = await open({ directory: true, multiple: false, title: "Choose an emulator save folder" });
  if (!path) return;
  state.busy = true; state.notice = null; render();
  try {
    state.scan = await invoke<ScanResult>("scan_directory", { path });
    state.selected.clear();
  } catch (error) {
    setNotice("error", String(error));
  } finally {
    state.busy = false; render();
  }
}

async function createPortableBundle(): Promise<void> {
  if (!state.scan) return;
  if (state.demo) {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ bundleReviewed: true }));
    state.step = "restore";
    setNotice("success", "Demo bundle review is ready. Sample data stayed separate from your files.");
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  const output = await save({ title: "Save portable bundle", defaultPath: `retro-saves-${date}.rspbundle`, filters: [{ name: "Retro Save bundle", extensions: ["rspbundle"] }] });
  if (!output) return;
  state.busy = true; render();
  try {
    const note = document.querySelector<HTMLTextAreaElement>("#bundle-note")?.value || null;
    const paths = state.scan.entries.filter(entry => state.selected.has(entry.id)).map(entry => entry.path);
    const summary = await invoke<{ fileCount: number; path: string }>("create_bundle", { root: state.scan.root, paths, output, note });
    addJournal({ action: "bundle", count: summary.fileCount, location: summary.path });
    state.step = "restore";
    setNotice("success", `Bundle ready: ${summary.fileCount} saves written to ${summary.path}`);
  } catch (error) {
    setNotice("error", String(error));
  } finally { state.busy = false; render(); }
}

function loadSampleProject(): void {
  state.demo = true;
  state.scan = structuredClone(sampleScan);
  state.selected = new Set(sampleScan.entries.map(entry => entry.id));
  state.plan = null;
  state.step = "scan";
  state.notice = { kind: "info", text: "Sample project loaded. It uses separate demo storage." };
  localStorage.setItem(DEMO_KEY, JSON.stringify({ openedAt: Date.now() }));
  render();
}

async function inspectPortableBundle(): Promise<void> {
  if (!isTauri()) return;
  const bundle = await open({ multiple: false, filters: [{ name: "Retro Save bundle", extensions: ["rspbundle"] }], title: "Choose a portable save bundle" });
  if (!bundle) return;
  const targetRoot = await open({ directory: true, multiple: false, title: "Choose the destination emulator save folder" });
  if (!targetRoot) return;
  state.busy = true; state.plan = null; render();
  try {
    state.plan = await invoke<ImportPlan>("inspect_bundle", { bundle, targetRoot });
  } catch (error) { setNotice("error", String(error)); }
  finally { state.busy = false; render(); }
}

async function restoreBundle(): Promise<void> {
  if (!state.plan) return;
  state.busy = true;
  const plan = state.plan;
  try {
    const result = await invoke<{ restoredCount: number }>("import_bundle", { bundle: plan.bundlePath, targetRoot: plan.targetRoot, allowOverwrite: plan.overwriteCount > 0 });
    addJournal({ action: "restore", count: result.restoredCount, location: plan.targetRoot });
    state.plan = null;
    setNotice("success", `${result.restoredCount} saves restored and verified. Open your emulator and confirm the game sees them before deleting the source copy.`);
  } catch (error) { setNotice("error", String(error)); }
  finally { state.busy = false; render(); }
}

async function restoreLicense(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>("#license-token");
  const status = document.querySelector<HTMLElement>("#license-status");
  if (!input?.value.trim() || !status) return;
  storeLicense(input.value);
  status.textContent = "Checking license…";
  try {
    const verdict = await verifyLicense(true);
    if (verdict?.valid) { state.pro = true; render(); (document.querySelector<HTMLDialogElement>("#license-dialog"))?.showModal(); }
    else status.textContent = "This license is not active. Check the token or purchase again.";
  } catch { status.textContent = "Could not reach the license service. Your free tools still work offline."; }
}

captureLicenseFromUrl();
verifyLicense().then(verdict => { if (verdict) { state.pro = verdict.valid; render(); } }).catch(() => undefined);
render();
