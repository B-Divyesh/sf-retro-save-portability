export const LICENSE_KEY = "sb_license:retro-save-portability";
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const DAY_MS = 86_400_000;

export interface LicenseVerdict {
  valid: boolean;
  reason: "ok" | "invalid" | "expired" | "revoked" | "wrong_product";
  expires_at?: string | null;
}

interface CachedVerdict extends LicenseVerdict {
  checkedAt: number;
}

export function captureLicenseFromUrl(url = new URL(window.location.href)): string | null {
  const token = url.searchParams.get("license")?.trim() || null;
  if (!token) return null;
  localStorage.setItem(LICENSE_KEY, token);
  url.searchParams.delete("license");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return token;
}

export function storeLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

export function cachedLicenseValid(now = Date.now()): boolean {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return false;
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) || "null") as CachedVerdict | null;
    return verdict?.valid === true && now - verdict.checkedAt < DAY_MS;
  } catch {
    return false;
  }
}

export async function verifyLicense(force = false): Promise<LicenseVerdict | null> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return null;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || "null") as CachedVerdict | null;
      if (cached && Date.now() - cached.checkedAt < DAY_MS) return cached;
    } catch {
      // A broken cache should be replaced by a fresh verdict.
    }
  }
  const response = await fetch(
    `https://api.sociobot.in/api/v1/products/retro-save-portability/verify?license=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("License service is temporarily unavailable.");
  const verdict = (await response.json()) as LicenseVerdict;
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ ...verdict, checkedAt: Date.now() }));
  return verdict;
}
