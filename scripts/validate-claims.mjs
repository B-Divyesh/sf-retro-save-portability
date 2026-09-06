import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const claims = JSON.parse(await readFile(resolve(".factory/claims.json"), "utf8"));
if (!Array.isArray(claims) || claims.length === 0) throw new Error("The claims registry is empty.");

const ids = new Set();
for (const claim of claims) {
  if (!claim.id || !claim.claim || !claim.where || !claim.test || !claim.sandbox) {
    throw new Error(`Incomplete claim entry: ${JSON.stringify(claim)}`);
  }
  if (ids.has(claim.id)) throw new Error(`Duplicate claim id: ${claim.id}`);
  ids.add(claim.id);
}

async function testFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await testFiles(path));
    else if ([".ts", ".js", ".mjs"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const sources = await Promise.all((await testFiles("tests")).map(file => readFile(file, "utf8")));
for (const id of ids) {
  const tag = `@claim:${id}`;
  const occurrences = sources.reduce((count, source) => count + source.split(tag).length - 1, 0);
  if (occurrences !== 1) throw new Error(`${tag} appears ${occurrences} times in tests; expected exactly once.`);
}

console.log(`Validated ${claims.length} registered claims and unique test tags.`);
