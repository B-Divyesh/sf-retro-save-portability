import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";

function runRustOutcome(testName: string): void {
  execFileSync(
    "cargo",
    ["test", "--manifest-path", "src-tauri/Cargo.toml", testName, "--", "--nocapture"],
    { cwd: process.cwd(), stdio: "pipe", timeout: 120_000 }
  );
}

describe("native product claims", () => {
  it("@claim:native-scan verifies read-only detection, hashes, coverage, and the 128 MiB boundary", () => {
    runRustOutcome("claim_scan_safety_coverage_and_boundaries");
  }, 120_000);

  it("@claim:native-bundle verifies the portable bundle and manifest as a consumer would read them", () => {
    runRustOutcome("claim_bundle_contains_selected_saves_and_readable_manifest");
  }, 120_000);

  it("@claim:native-restore verifies warnings, integrity checks, path checks, and replacement recovery", () => {
    runRustOutcome("claim_restore_preflight_and_defences");
  }, 120_000);
});
