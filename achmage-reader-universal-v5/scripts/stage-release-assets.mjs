import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tauriConfig = JSON.parse(
  fs.readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8"),
);
const productName = tauriConfig.productName ?? "Achmage Reader";
const version = tauriConfig.version;
const productSlug = productName.replace(/\s+/g, "-");
const args = process.argv.slice(2);
const platformFlagIndex = args.indexOf("--platform");
const inferredPlatform =
  process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : null;
const platform = platformFlagIndex >= 0 ? args[platformFlagIndex + 1] : inferredPlatform;

if (!platform || !["windows", "macos"].includes(platform)) {
  throw new Error("Pass --platform windows or --platform macos.");
}

const releaseDir = path.join(root, "release-assets");
const stagingRoot = path.join(root, ".release-staging");

fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(stagingRoot, { recursive: true });

const removeIfExists = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
};

const findFirst = (dir, predicate) => {
  if (!fs.existsSync(dir)) {
    return null;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFirst(next, predicate);
      if (nested) {
        return nested;
      }
      continue;
    }

    if (predicate(next, entry.name)) {
      return next;
    }
  }

  return null;
};

const writePortableReadme = (targetDir) => {
  const portableReadme = [
    "Achmage Reader portable package",
    "",
    "1. Run achmage-reader-universal-v5.exe.",
    "2. On Windows, Microsoft Edge WebView2 Runtime must be available.",
    "3. The app reads your vault but does not modify Markdown files.",
    "",
    `Version: ${version}`,
  ].join(os.EOL);

  fs.writeFileSync(path.join(targetDir, "README-portable.txt"), portableReadme, "utf8");
};

if (platform === "windows") {
  const installerSource = findFirst(
    path.join(root, "src-tauri", "target", "release", "bundle", "nsis"),
    (filePath, entryName) => entryName.endsWith(".exe") && filePath.includes("-setup"),
  );
  const exeSource = path.join(root, "src-tauri", "target", "release", "achmage-reader-universal-v5.exe");

  if (!installerSource) {
    throw new Error("Windows installer not found. Run `npm run package:windows` first.");
  }

  if (!fs.existsSync(exeSource)) {
    throw new Error("Release executable not found. Run `npm run package:windows` first.");
  }

  const installerTarget = path.join(
    releaseDir,
    `${productSlug}_${version}_windows_x64_setup.exe`,
  );
  const portableTarget = path.join(
    releaseDir,
    `${productSlug}_${version}_windows_x64_portable.zip`,
  );
  const portableStageDir = path.join(stagingRoot, "windows-portable");

  removeIfExists(installerTarget);
  removeIfExists(portableTarget);
  removeIfExists(portableStageDir);
  fs.mkdirSync(portableStageDir, { recursive: true });

  fs.copyFileSync(installerSource, installerTarget);
  fs.copyFileSync(exeSource, path.join(portableStageDir, "achmage-reader-universal-v5.exe"));
  writePortableReadme(portableStageDir);

  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Compress-Archive -Path (Join-Path $env:STAGE '*') -DestinationPath $env:DEST -Force",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        STAGE: portableStageDir,
        DEST: portableTarget,
      },
    },
  );

  removeIfExists(portableStageDir);
  console.log(`Staged Windows release assets in ${releaseDir}`);
}

if (platform === "macos") {
  const bundleRootCandidates = [
    path.join(root, "src-tauri", "target", "universal-apple-darwin", "release", "bundle"),
    path.join(root, "src-tauri", "target", "release", "bundle"),
  ];
  const bundleRoot = bundleRootCandidates.find((candidate) => fs.existsSync(candidate));

  if (!bundleRoot) {
    throw new Error("macOS bundle directory not found. Run `npm run package:macos` first.");
  }

  const dmgSource = findFirst(bundleRoot, (_, entryName) => entryName.endsWith(".dmg"));
  const appSource = findFirst(bundleRoot, (_, entryName) => entryName.endsWith(".app"));

  if (!dmgSource || !appSource) {
    throw new Error("macOS DMG or .app bundle not found. Run `npm run package:macos` first.");
  }

  const dmgTarget = path.join(
    releaseDir,
    `${productSlug}_${version}_macos_universal.dmg`,
  );
  const appZipTarget = path.join(
    releaseDir,
    `${productSlug}_${version}_macos_universal.app.zip`,
  );

  removeIfExists(dmgTarget);
  removeIfExists(appZipTarget);
  fs.copyFileSync(dmgSource, dmgTarget);

  execFileSync(
    "ditto",
    ["-c", "-k", "--sequesterRsrc", "--keepParent", appSource, appZipTarget],
    { stdio: "inherit" },
  );

  console.log(`Staged macOS release assets in ${releaseDir}`);
}
