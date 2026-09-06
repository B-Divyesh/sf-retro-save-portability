import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const releaseNames = [
  "retro-save-portability_9.9.9_macos-arm64.dmg",
  "retro-save-portability_9.9.9_macos-x64.dmg",
  "retro-save-portability_9.9.9_windows-x64.msi",
  "retro-save-portability_9.9.9_windows-x64-setup.exe",
  "retro-save-portability_9.9.9_linux-x64.AppImage",
  "retro-save-portability_9.9.9_linux-x64.deb"
];

describe("release consumer files", () => {
  it("@claim:release-manifest publishes six platform entries with matching SHA-256 values", () => {
    const directory = mkdtempSync(join(tmpdir(), "rsp-release-"));
    for (const name of releaseNames) writeFileSync(join(directory, name), `artifact:${name}`);
    execFileSync("node", ["scripts/make-release-manifest.mjs", directory], {
      cwd: process.cwd(),
      env: { ...process.env, RELEASE_VERSION: "9.9.9", GITHUB_REPOSITORY: "example/portable" }
    });

    const manifest = JSON.parse(readFileSync(join(directory, "latest.json"), "utf8"));
    expect(manifest.version).toBe("v9.9.9");
    expect(Object.keys(manifest.platforms).sort()).toEqual([
      "linux-appimage", "linux-deb", "macos-arm64", "macos-x64", "windows", "windows-exe"
    ]);
    const sums = readFileSync(join(directory, "SHA256SUMS"), "utf8").trim().split("\n");
    expect(sums).toHaveLength(6);
    for (const platform of Object.values(manifest.platforms) as Array<{ name: string; sha256: string; url: string }>) {
      expect(sums).toContain(`${platform.sha256}  ${platform.name}`);
      expect(platform.url).toContain(`/releases/latest/download/${platform.name}`);
    }
  });

  it("@claim:installer-checksum refuses a mismatch and installs an artifact only after SHA-256 matches", () => {
    const directory = mkdtempSync(join(tmpdir(), "rsp-installer-"));
    const mockBin = join(directory, "mock-bin");
    const installBin = join(directory, "installed");
    mkdirSync(mockBin);
    mkdirSync(installBin);
    const artifact = join(directory, "artifact");
    const sums = join(directory, "SHA256SUMS");
    writeFileSync(artifact, "candidate-appimage");
    writeFileSync(join(mockBin, "uname"), "#!/bin/sh\n[ \"${1:-}\" = \"-m\" ] && echo x86_64 || echo Linux\n");
    writeFileSync(join(mockBin, "curl"), `#!/bin/sh
url=""; out=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
case "$url" in
  */SHA256SUMS) cp "$RSP_FIXTURE_SUMS" "$out" ;;
  *) cp "$RSP_FIXTURE_ARTIFACT" "$out" ;;
esac
`);
    chmodSync(join(mockBin, "uname"), 0o755);
    chmodSync(join(mockBin, "curl"), 0o755);
    const environment = {
      ...process.env,
      PATH: `${mockBin}:${process.env.PATH}`,
      XDG_BIN_HOME: installBin,
      RSP_FIXTURE_ARTIFACT: artifact,
      RSP_FIXTURE_SUMS: sums
    };

    writeFileSync(sums, `${"0".repeat(64)}  retro-save-portability_0.1.3_linux-x64.AppImage\n`);
    const rejected = spawnSync("sh", ["public/install.sh"], { cwd: process.cwd(), env: environment, encoding: "utf8" });
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("SHA-256 mismatch");

    const digest = execFileSync("shasum", ["-a", "256", artifact], { encoding: "utf8" }).split(/\s+/)[0];
    writeFileSync(sums, `${digest}  retro-save-portability_0.1.3_linux-x64.AppImage\n`);
    const accepted = spawnSync("sh", ["public/install.sh"], { cwd: process.cwd(), env: environment, encoding: "utf8" });
    expect(accepted.status, accepted.stderr).toBe(0);
    expect(readFileSync(join(installBin, "retro-save-portability"), "utf8")).toBe("candidate-appimage");
    expect(accepted.stdout).toContain(`SHA-256 verified: ${digest}`);
  });
});
