import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const releaseRoot = path.resolve(projectRoot, '..', 'release-builds');
const sourceRepoName = 'achmage-markdown-renderer';
const runtimeFolderName = `${sourceRepoName}-runtime`;

const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
const sourceDir = path.join(releaseRoot, sourceRepoName);
const runtimeDir = path.join(releaseRoot, runtimeFolderName);
const runtimeZipPath = path.join(releaseRoot, `${runtimeFolderName}-${version}.zip`);

const sourceEntries = [
  '.gitignore',
  'README.md',
  'RELEASE_NOTES.md',
  'PUBLISH_TO_GITHUB.md',
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  'playwright.config.ts',
  'vitest.config.ts',
  'launch-viewer.cmd',
  'launch-viewer.ps1',
  'scripts',
  'src',
  'public',
  'tests',
];

const runtimeEntries = [
  '.gitignore',
  'README.md',
  'RELEASE_NOTES.md',
  'package.json',
  'package-lock.json',
  'astro.config.mjs',
  'tsconfig.json',
  'launch-viewer.cmd',
  'launch-viewer.ps1',
  'scripts',
  'src',
  'public',
];

function log(message) {
  console.log(`[package:v2] ${message}`);
}

function fail(message) {
  console.error(`[package:v2] ${message}`);
  process.exit(1);
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, {recursive: true, force: true});
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, {recursive: true});
}

function copyEntry(relativePath, destinationRoot) {
  const sourcePath = path.join(projectRoot, relativePath);
  const destinationPath = path.join(destinationRoot, relativePath);

  if (!fs.existsSync(sourcePath)) {
    fail(`Missing required path: ${relativePath}`);
  }

  const stat = fs.statSync(sourcePath);
  ensureDir(path.dirname(destinationPath));

  if (stat.isDirectory()) {
    const powerShell = resolvePowerShell();
    const copyCommand = `Copy-Item -LiteralPath '${quoteForPowerShell(
      sourcePath,
    )}' -Destination '${quoteForPowerShell(path.dirname(destinationPath))}' -Recurse -Force`;
    const result = spawnSync(powerShell, ['-NoLogo', '-NoProfile', '-Command', copyCommand], {
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      fail(`Failed to copy directory: ${relativePath}`);
    }
    return;
  }

  fs.copyFileSync(sourcePath, destinationPath);
}

function pruneRuntimeArtifacts(destinationRoot) {
  removeIfExists(path.join(destinationRoot, 'public', '_doc-assets'));
  removeIfExists(path.join(destinationRoot, 'node_modules'));
  removeIfExists(path.join(destinationRoot, 'dist'));
  removeIfExists(path.join(destinationRoot, '.astro'));
  removeIfExists(path.join(destinationRoot, '.home'));
  removeIfExists(path.join(destinationRoot, '.tmp'));
  removeIfExists(path.join(destinationRoot, '.npm-cache'));
  removeIfExists(path.join(destinationRoot, '.npm-tmp'));
  removeIfExists(path.join(destinationRoot, 'test-results'));
  removeIfExists(path.join(destinationRoot, '.doc-workspace-content-dir'));
  removeIfExists(path.join(destinationRoot, '.viewer-session.json'));
  removeIfExists(path.join(destinationRoot, 'Microsoft'));
}

function stagePackage(entries, destinationRoot) {
  removeIfExists(destinationRoot);
  ensureDir(destinationRoot);

  for (const entry of entries) {
    copyEntry(entry, destinationRoot);
  }

  pruneRuntimeArtifacts(destinationRoot);
}

function quoteForPowerShell(value) {
  return value.replace(/'/g, "''");
}

function resolvePowerShell() {
  const absoluteCandidate = path.join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );

  for (const candidate of ['pwsh.exe', 'powershell.exe', absoluteCandidate]) {
    const result = spawnSync(candidate, ['-NoLogo', '-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
      stdio: 'ignore',
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  fail('PowerShell executable was not found. Runtime ZIP could not be created.');
}

function createRuntimeZip() {
  removeIfExists(runtimeZipPath);

  const powerShell = resolvePowerShell();
  const command = `Compress-Archive -LiteralPath '${quoteForPowerShell(
    runtimeDir,
  )}' -DestinationPath '${quoteForPowerShell(runtimeZipPath)}' -Force`;

  const result = spawnSync(powerShell, ['-NoLogo', '-NoProfile', '-Command', command], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    fail('Compress-Archive failed while creating the runtime ZIP.');
  }
}

function getGitConfig(key) {
  const result = spawnSync('git', ['config', '--get', key], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.status !== 0) {
    return '';
  }

  return result.stdout.trim();
}

function initializeSourceRepo() {
  const gitCheck = spawnSync('git', ['--version'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (gitCheck.status !== 0) {
    log('Git was not found. Skipping repository initialization.');
    return;
  }

  const initResult = spawnSync('git', ['init'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
  if (initResult.status !== 0) {
    fail('git init failed for the V2 source package.');
  }

  spawnSync('git', ['branch', '-M', 'main'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });

  const addResult = spawnSync('git', ['-c', 'core.autocrlf=false', 'add', '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
  if (addResult.status !== 0) {
    fail('git add failed for the V2 source package.');
  }

  const gitUserName = getGitConfig('user.name');
  const gitUserEmail = getGitConfig('user.email');

  if (!gitUserName || !gitUserEmail) {
    log('Git user.name / user.email are not configured. Initial commit was skipped.');
    return;
  }

  const commitResult = spawnSync('git', ['commit', '-m', `chore: prepare v${version}`], {
    cwd: sourceDir,
    stdio: 'inherit',
  });

  if (commitResult.status !== 0) {
    fail('git commit failed for the V2 source package.');
  }
}

function main() {
  ensureDir(releaseRoot);

  log(`Staging source package to ${sourceDir}`);
  stagePackage(sourceEntries, sourceDir);

  log(`Staging runtime package to ${runtimeDir}`);
  stagePackage(runtimeEntries, runtimeDir);

  log('Initializing a git repository in the staged source package');
  initializeSourceRepo();

  log(`Creating runtime ZIP at ${runtimeZipPath}`);
  createRuntimeZip();

  log('Done.');
  log(`Source package: ${sourceDir}`);
  log(`Runtime folder: ${runtimeDir}`);
  log(`Runtime ZIP: ${runtimeZipPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}
