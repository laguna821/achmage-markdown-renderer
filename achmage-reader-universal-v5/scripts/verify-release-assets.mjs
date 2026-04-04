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
const tempDir = path.join(root, ".release-staging", "verify");

const ensureFile = (filePath, minimumBytes) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing release asset: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size < minimumBytes) {
    throw new Error(`Release asset is unexpectedly small: ${filePath} (${stat.size} bytes)`);
  }
};

const cleanTemp = () => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

cleanTemp();
fs.mkdirSync(tempDir, { recursive: true });

if (platform === "windows") {
  const installerPath = path.join(
    releaseDir,
    `${productSlug}_${version}_windows_x64_setup.exe`,
  );
  const portableZipPath = path.join(
    releaseDir,
    `${productSlug}_${version}_windows_x64_portable.zip`,
  );

  ensureFile(installerPath, 1 * 1024 * 1024);
  ensureFile(portableZipPath, 2 * 1024 * 1024);

  const unzipDir = path.join(tempDir, "windows-portable");
  fs.mkdirSync(unzipDir, { recursive: true });

  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $env:ZIP -DestinationPath $env:DEST -Force",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        ZIP: portableZipPath,
        DEST: unzipDir,
      },
    },
  );

  const portableExe = path.join(unzipDir, "achmage-reader-universal-v5.exe");
  ensureFile(portableExe, 5 * 1024 * 1024);
  console.log(`Verified Windows release assets in ${releaseDir}`);
}

if (platform === "macos") {
  const dmgPath = path.join(
    releaseDir,
    `${productSlug}_${version}_macos_universal.dmg`,
  );
  const appZipPath = path.join(
    releaseDir,
    `${productSlug}_${version}_macos_universal.app.zip`,
  );

  ensureFile(dmgPath, 1 * 1024 * 1024);
  ensureFile(appZipPath, 1 * 1024 * 1024);

  if (process.platform === "darwin") {
    execFileSync("hdiutil", ["verify", dmgPath], { stdio: "inherit" });
    execFileSync("ditto", ["-x", "-k", appZipPath, tempDir], { stdio: "inherit" });

    const appDir = fs
      .readdirSync(tempDir, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.endsWith(".app"));

    if (!appDir) {
      throw new Error(`Unable to extract .app bundle from ${appZipPath}`);
    }
  }

  console.log(`Verified macOS release assets in ${releaseDir}`);
}

cleanTemp();
