import { captureLicenseFromUrl, storeLicense, verifyLicense } from "../src/license";
import "./styles.css";

interface ReleaseAsset {
  url: string;
  sha256?: string;
  name?: string;
}
interface LatestManifest {
  version: string;
  platforms: Record<string, ReleaseAsset>;
}

const RELEASE_MANIFEST = location.hostname.endsWith("sociobot.in")
  ? "https://github.com/B-Divyesh/sf-retro-save-portability/releases/latest/download/latest.json"
  : "/latest.json";

function detectedPlatform(): { key: string; label: string } {
  const platform = navigator.platform.toLowerCase();
  const agent = navigator.userAgent.toLowerCase();
  if (platform.includes("win") || agent.includes("windows")) return { key: "windows", label: "Windows" };
  if (platform.includes("mac") || agent.includes("mac os")) return { key: "macos-arm64", label: "macOS" };
  if (platform.includes("linux") || agent.includes("linux")) return { key: "linux-appimage", label: "Linux" };
  return { key: "linux-appimage", label: "your computer" };
}

async function loadRelease(): Promise<void> {
  const button = document.querySelector<HTMLAnchorElement>("#platform-download");
  const label = document.querySelector<HTMLElement>("#platform-label");
  const status = document.querySelector<HTMLElement>("#download-status");
  if (!button || !label || !status) return;
  const platform = detectedPlatform();
  label.textContent = `Download for ${platform.label}`;
  if (platform.key === "windows") document.querySelector("#install-command")!.textContent = "irm https://retro-save-portability.sociobot.in/install.ps1 | iex";
  try {
    const response = await fetch(RELEASE_MANIFEST, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("No release manifest");
    const manifest = await response.json() as LatestManifest;
    const asset = manifest.platforms[platform.key];
    if (!asset?.url) throw new Error("No platform asset");
    button.href = asset.url;
    button.textContent = `Download ${manifest.version} for ${platform.label}`;
    button.classList.remove("disabled");
    status.textContent = asset.sha256 ? `SHA-256: ${asset.sha256.slice(0, 16)}… · Verify with SHA256SUMS` : "Checksum available in the release notes.";
    document.querySelectorAll<HTMLAnchorElement>("[data-platform]").forEach(link => {
      const match = manifest.platforms[link.dataset.platform || ""];
      if (match) link.href = match.url;
    });
  } catch {
    button.classList.remove("disabled");
    button.textContent = "View latest GitHub release";
    status.textContent = navigator.onLine ? "Release manifest is not published yet. GitHub shows all available installers." : "You appear offline. Reconnect to fetch installer links.";
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach(button => button.addEventListener("click", async () => {
  const target = document.querySelector<HTMLElement>(button.dataset.copy || "");
  if (!target) return;
  try { await navigator.clipboard.writeText(target.textContent || ""); button.textContent = "Copied"; }
  catch { button.textContent = "Select and copy the command"; }
}));

document.querySelector("#show-license")?.addEventListener("click", () => document.querySelector<HTMLDialogElement>("#license-dialog")?.showModal());
document.querySelector("#verify-license")?.addEventListener("click", async () => {
  const input = document.querySelector<HTMLInputElement>("#license-token");
  const result = document.querySelector<HTMLElement>("#license-result");
  if (!input?.value.trim() || !result) return;
  storeLicense(input.value);
  result.textContent = "Checking…";
  try {
    const verdict = await verifyLicense(true);
    result.textContent = verdict?.valid ? "License active. Paste the same token into the desktop app to unlock Keeper." : "That license is not active. Check the token and try again.";
  } catch { result.textContent = "License service unavailable. Try again when you are online."; }
});

captureLicenseFromUrl();
void loadRelease();
