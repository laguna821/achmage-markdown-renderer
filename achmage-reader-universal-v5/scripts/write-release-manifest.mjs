import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetRootArg = process.argv[2] ?? "release-assets";
const assetRoot = path.resolve(root, assetRootArg);

if (!fs.existsSync(assetRoot)) {
  throw new Error(`Asset directory not found: ${assetRoot}`);
}

const files = [];
const ignoredFiles = new Set(["release-manifest.json", "SHA256SUMS.txt"]);

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(next);
      continue;
    }

    if (!ignoredFiles.has(path.basename(next))) {
      files.push(next);
    }
  }
};

walk(assetRoot);

if (files.length === 0) {
  throw new Error(`No releasable files found in ${assetRoot}`);
}

const manifest = files
  .sort((left, right) => left.localeCompare(right))
  .map((filePath) => {
    const hash = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    return {
      file: path.relative(assetRoot, filePath).replace(/\\/g, "/"),
      sha256: hash,
      bytes: fs.statSync(filePath).size,
    };
  });

const manifestPath = path.join(assetRoot, "release-manifest.json");
const checksumsPath = path.join(assetRoot, "SHA256SUMS.txt");
const checksums = manifest.map((entry) => `${entry.sha256}  ${entry.file}`).join("\n");

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(checksumsPath, `${checksums}\n`, "utf8");
console.log(`Wrote ${manifest.length} release entries to ${manifestPath}`);
console.log(`Wrote SHA256 checksums to ${checksumsPath}`);
