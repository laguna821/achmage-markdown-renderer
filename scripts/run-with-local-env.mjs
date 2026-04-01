import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');
const localHome = path.join(workspaceRoot, '.home');
const localTmp = path.join(workspaceRoot, '.tmp');
const localAppData = path.join(localHome, 'AppData', 'Roaming');
const localAppDataLocal = path.join(localHome, 'AppData', 'Local');

for (const dir of [localHome, localTmp, localAppData, localAppDataLocal]) {
  fs.mkdirSync(dir, {recursive: true});
}

const [target, ...targetArgs] = process.argv.slice(2);

if (!target) {
  console.error('Usage: node scripts/run-with-local-env.mjs <command-or-js-file> [...args]');
  process.exit(1);
}

const env = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
  HOME: localHome,
  USERPROFILE: localHome,
  HOMEDRIVE: path.parse(localHome).root.replace(/[\\/]+$/, ''),
  HOMEPATH: localHome.slice(path.parse(localHome).root.replace(/[\\/]+$/, '').length),
  TEMP: localTmp,
  TMP: localTmp,
  APPDATA: localAppData,
  LOCALAPPDATA: localAppDataLocal,
  ASTRO_TELEMETRY_DISABLED: process.env.ASTRO_TELEMETRY_DISABLED ?? '1',
};

const looksLikeJsEntry = /\.(?:c?m?js)$/i.test(target);
const resolvedTarget = looksLikeJsEntry ? path.resolve(workspaceRoot, target) : target;
const command = looksLikeJsEntry ? process.execPath : target;
const args = looksLikeJsEntry ? [resolvedTarget, ...targetArgs] : targetArgs;

const child = spawn(command, args, {
  cwd: workspaceRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
