import "./styles.css";

const DEMO_KEY = "demo:retro-save-portability:sample";
const sample = [
  { game: "Golden Sun", file: "GoldenSun.sav", detail: "mGBA · Native battery save · 32 KB", state: "identified" },
  { game: "Chrono Trigger", file: "chrono.srm", detail: "RetroArch · Battery save · 8 KB", state: "identified" },
  { game: "Road trip save", file: "slot-01.sav", detail: "Unknown emulator · Review before restore · 128 KB", state: "review" }
];

function render(): void {
  const list = document.querySelector<HTMLUListElement>("#demo-list");
  if (!list) return;
  list.innerHTML = sample.map(item => `<li><div><strong>${item.game}</strong><br><span>${item.file} · ${item.detail}</span></div><b class="stamp ${item.state === "identified" ? "ok" : "warn"}">${item.state}</b></li>`).join("");
}

function reset(): void {
  localStorage.setItem(DEMO_KEY, JSON.stringify({ openedAt: Date.now(), bundleReviewed: false }));
  const status = document.querySelector<HTMLElement>("#demo-status");
  if (status) status.textContent = "Sample scan reset. Nothing was written outside demo storage.";
}

document.querySelector("#reset-demo")?.addEventListener("click", reset);
document.querySelector("#make-demo-bundle")?.addEventListener("click", () => {
  try {
    const current = JSON.parse(localStorage.getItem(DEMO_KEY) || "{}") as Record<string, unknown>;
    localStorage.setItem(DEMO_KEY, JSON.stringify({ ...current, bundleReviewed: true }));
  } catch { reset(); }
  const status = document.querySelector<HTMLElement>("#demo-status");
  if (status) status.textContent = "Portable bundle review ready: 3 sample saves, 168 KB, with integrity labels.";
});

reset();
render();
