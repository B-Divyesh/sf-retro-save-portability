import { captureLicenseFromUrl, storeLicense, verifyLicense } from "../src/license";
import "./styles.css";

interface GitHubAsset { name: string; browser_download_url: string; digest?: string; }
interface GitHubRelease { tag_name: string; html_url: string; assets: GitHubAsset[]; }
interface ReleaseAsset { url: string; sha256?: string; }
interface CachedRelease { savedAt: number; release: GitHubRelease; }

const RELEASE_API = "https://api.github.com/repos/B-Divyesh/sf-retro-save-portability/releases/latest";
const RELEASE_PAGE = "https://github.com/B-Divyesh/sf-retro-save-portability/releases/latest";
const RELEASE_CACHE_KEY = "rsp:latest-release:v1";
const RELEASE_CACHE_MS = 60 * 60 * 1000;

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
  const installCommand = document.querySelector<HTMLElement>("#install-command");
  if (platform.key === "windows" && installCommand) installCommand.textContent = "irm https://retro-save-portability.sociobot.in/install.ps1 | iex";
  try {
    const release = await getLatestRelease();
    const assets = releaseAssets(release);
    const asset = assets[platform.key];
    if (!asset?.url) throw new Error("No platform asset");
    button.href = asset.url;
    button.textContent = `Download ${release.tag_name} for ${platform.label}`;
    button.classList.remove("disabled");
    status.textContent = asset.sha256 ? `SHA-256: ${asset.sha256.slice(0, 16)}… · Verify with SHA256SUMS` : "Checksum available in the release notes.";
    document.querySelectorAll<HTMLAnchorElement>("[data-platform]").forEach(link => {
      const match = assets[link.dataset.platform || ""];
      if (match) link.href = match.url;
    });
  } catch {
    button.classList.remove("disabled");
    button.href = RELEASE_PAGE;
    button.textContent = "View GitHub releases";
    status.textContent = navigator.onLine
      ? "Downloads are being published. Check GitHub releases in a few minutes."
      : "You are offline. Reconnect to check whether downloads are published.";
  }
}

function cachedRelease(now = Date.now()): GitHubRelease | null {
  try {
    const cached = JSON.parse(localStorage.getItem(RELEASE_CACHE_KEY) || "null") as CachedRelease | null;
    return cached && now - cached.savedAt < RELEASE_CACHE_MS && cached.release?.assets ? cached.release : null;
  } catch { return null; }
}

async function getLatestRelease(): Promise<GitHubRelease> {
  const cached = cachedRelease();
  if (cached) return cached;
  const response = await fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error("Latest release is unavailable");
  const release = await response.json() as GitHubRelease;
  if (!release.tag_name || !release.html_url || !Array.isArray(release.assets)) throw new Error("Latest release response is incomplete");
  try { localStorage.setItem(RELEASE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), release })); } catch { /* Storage may be unavailable. */ }
  return release;
}

function releaseAssets(release: GitHubRelease): Record<string, ReleaseAsset> {
  const names: Array<[string, string]> = [
    ["macos-arm64", "macos-arm64.dmg"], ["macos-x64", "macos-x64.dmg"],
    ["windows", "windows-x64.msi"], ["linux-appimage", "linux-x64.AppImage"], ["linux-deb", "linux-x64.deb"]
  ];
  return Object.fromEntries(names.flatMap(([platform, suffix]) => {
    const asset = release.assets.find(candidate => candidate.name.endsWith(suffix));
    return asset ? [[platform, { url: asset.browser_download_url, sha256: asset.digest?.replace(/^sha256:/, "") }]] : [];
  }));
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
