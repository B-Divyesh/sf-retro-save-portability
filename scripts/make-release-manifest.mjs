import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const directory = resolve(process.argv[2] || "release-assets");
const repository = process.env.GITHUB_REPOSITORY || "B-Divyesh/sf-retro-save-portability";
const version = process.env.RELEASE_VERSION || "0.1.0";
const files = (await readdir(directory)).filter(file => !file.endsWith(".json") && file !== "SHA256SUMS").sort();
const mappings = [
  ["macos-arm64.dmg", "macos-arm64"], ["macos-x64.dmg", "macos-x64"],
  ["windows-x64.msi", "windows"], ["windows-x64-setup.exe", "windows-exe"],
  ["linux-x64.AppImage", "linux-appimage"], ["linux-x64.deb", "linux-deb"]
];
const sums = [];
const platforms = {};
for (const file of files) {
  const bytes = await readFile(resolve(directory, file));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  sums.push(`${sha256}  ${basename(file)}`);
  const match = mappings.find(([suffix]) => file.endsWith(suffix));
  if (match) platforms[match[1]] = { name: file, url: `https://github.com/${repository}/releases/latest/download/${file}`, sha256 };
}
await writeFile(resolve(directory, "SHA256SUMS"), `${sums.join("\n")}\n`);
await writeFile(resolve(directory, "latest.json"), `${JSON.stringify({ version: `v${version}`, platforms }, null, 2)}\n`);
if (Object.keys(platforms).length < 6) throw new Error(`Expected 6 platform assets, found ${Object.keys(platforms).length}`);
