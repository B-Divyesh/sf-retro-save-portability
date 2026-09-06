import { beforeEach, describe, expect, it, vi } from "vitest";
import { LICENSE_KEY, cachedLicenseValid, captureLicenseFromUrl, clearLicense, storeLicense, verifyLicense } from "../src/license";

describe("license handling", () => {
  beforeEach(() => { localStorage.clear(); history.replaceState({}, "", "/"); vi.restoreAllMocks(); });

  it("@claim:license-verification stores a returned token, strips the URL, and reuses a verdict for one day", async () => {
    const token = captureLicenseFromUrl(new URL("https://example.test/?license=keeper-123&from=checkout"));
    expect(token).toBe("keeper-123");
    expect(localStorage.getItem(LICENSE_KEY)).toBe("keeper-123");
    expect(location.search).toBe("?from=checkout");

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, reason: "ok", expires_at: null }) });
    vi.stubGlobal("fetch", fetchMock);
    expect((await verifyLicense(true))?.valid).toBe(true);
    expect(cachedLicenseValid()).toBe(true);
    expect((await verifyLicense())?.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();

    const verdictKey = `${LICENSE_KEY}:verdict`;
    const cached = JSON.parse(localStorage.getItem(verdictKey) || "{}");
    localStorage.setItem(verdictKey, JSON.stringify({ ...cached, checkedAt: Date.now() - 86_400_001 }));
    await verifyLicense();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false, reason: "revoked", expires_at: null }) });
    expect((await verifyLicense(true))?.valid).toBe(false);
    expect(cachedLicenseValid()).toBe(false);
  });

  it("clears token and cached verdict", () => {
    storeLicense("test-token"); clearLicense();
    expect(localStorage.getItem(LICENSE_KEY)).toBeNull();
    expect(cachedLicenseValid()).toBe(false);
  });
});
