import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runRustOutcome(testName: string): Promise<void> {
  await execFileAsync(
    "cargo",
    ["test", "--manifest-path", "src-tauri/Cargo.toml", testName, "--", "--nocapture"],
    { cwd: process.cwd(), timeout: 180_000, maxBuffer: 10 * 1024 * 1024 }
  );
}

describe("native product claims", () => {
  it("@claim:native-scan verifies read-only detection, hashes, coverage, and the 128 MiB boundary", async () => {
    await runRustOutcome("claim_scan_safety_coverage_and_boundaries");
  }, 180_000);

  it("@claim:native-bundle verifies the portable bundle and manifest as a consumer would read them", async () => {
    await runRustOutcome("claim_bundle_contains_selected_saves_and_readable_manifest");
  }, 180_000);

  it("@claim:native-restore verifies warnings, integrity checks, path checks, and replacement recovery", async () => {
    await runRustOutcome("claim_restore_preflight_and_defences");
  }, 180_000);
});
