import { beforeEach, describe, expect, it, vi } from "vitest";
import { LICENSE_KEY, cachedLicenseValid, captureLicenseFromUrl, clearLicense, storeLicense, verifyLicense } from "../src/license";

describe("license handling", () => {
  beforeEach(() => { localStorage.clear(); history.replaceState({}, "", "/"); vi.restoreAllMocks(); });

  it("captures a returned license and removes it from the URL", () => {
    const token = captureLicenseFromUrl(new URL("https://example.test/?license=keeper-123&from=checkout"));
    expect(token).toBe("keeper-123");
    expect(localStorage.getItem(LICENSE_KEY)).toBe("keeper-123");
    expect(location.search).toBe("?from=checkout");
  });

  it("verifies and caches a valid token", async () => {
    storeLicense("test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, reason: "ok", expires_at: null }) }));
    expect((await verifyLicense(true))?.valid).toBe(true);
    expect(cachedLicenseValid()).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("clears token and cached verdict", () => {
    storeLicense("test-token"); clearLicense();
    expect(localStorage.getItem(LICENSE_KEY)).toBeNull();
    expect(cachedLicenseValid()).toBe(false);
  });
});
