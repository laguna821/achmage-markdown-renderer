import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

import {describe, expect, test} from 'vitest';

const describeWindows = process.platform === 'win32' ? describe : describe.skip;

const scriptPath = path.resolve(process.cwd(), 'launch-viewer.ps1');
const shellCommand = existsSync('C:\\Program Files\\PowerShell\\7\\pwsh.exe')
  ? 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
  : 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

const runLauncher = (args: string[], envOverrides?: Record<string, string | undefined>): Record<string, unknown> => {
  const output = execFileSync(
    shellCommand,
    ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        ...envOverrides,
      },
    },
  );

  return JSON.parse(output);
};

describeWindows('launch-viewer', () => {
  test('emits a launch plan for an explicit vault path in dry-run mode', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md-launcher-explicit-'));
    const vaultPath = path.join(tempRoot, 'Meaning Vault');
    fs.mkdirSync(vaultPath, {recursive: true});

    try {
      const plan = runLauncher(['-VaultPath', vaultPath, '-Port', '4510', '-NoOpenBrowser', '-DryRun']);

      expect(plan.vaultPath).toBe(vaultPath);
      expect(plan.port).toBe(4510);
      expect(plan.url).toBe('http://127.0.0.1:4510/');
      expect(plan.workspaceRoot).toBe(process.cwd());
      expect(typeof plan.shellPath).toBe('string');
      expect(String(plan.shellPath).toLowerCase()).toMatch(/(pwsh|powershell)(\.exe)?$/);
      expect(typeof plan.nodePath).toBe('string');
      expect(String(plan.nodePath).toLowerCase()).toMatch(/node(\.exe)?$/);
      expect(plan.needsInstall).toBe(false);
      expect(String(plan.launchCommand)).toContain('run-with-local-env.mjs');
      expect(String(plan.launchCommand)).toContain("'.\\node_modules\\astro\\astro.js' 'dev' '--host' '127.0.0.1' '--port' '4510'");
    } finally {
      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  });

  test('uses the workspace content-root file when vault path is omitted in dry-run mode', () => {
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'md-launcher-config-'));
    const configuredVault = path.join(tempWorkspace, '40. Meaning (M)');
    fs.mkdirSync(configuredVault, {recursive: true});
    fs.writeFileSync(path.join(tempWorkspace, '.doc-workspace-content-dir'), configuredVault, 'utf8');
    fs.writeFileSync(path.join(tempWorkspace, 'package.json'), '{"name":"tmp-workspace","private":true}', 'utf8');

    try {
      const plan = runLauncher(['-WorkspaceRoot', tempWorkspace, '-Port', '4511', '-NoOpenBrowser', '-DryRun']);

      expect(plan.vaultPath).toBe(configuredVault);
      expect(plan.contentRootFile).toBe(path.join(tempWorkspace, '.doc-workspace-content-dir'));
      expect(plan.sessionFile).toBe(path.join(tempWorkspace, '.viewer-session.json'));
      expect(plan.needsInstall).toBe(true);
    } finally {
      fs.rmSync(tempWorkspace, {recursive: true, force: true});
    }
  });

  test('dry-run still works when npm is not available on PATH but dependencies are already installed', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md-launcher-no-npm-'));
    const vaultPath = path.join(tempRoot, 'Meaning Vault');
    fs.mkdirSync(vaultPath, {recursive: true});

    try {
      const plan = runLauncher(['-VaultPath', vaultPath, '-Port', '4512', '-NoOpenBrowser', '-DryRun'], {
        PATH: 'C:\\Windows\\System32',
      });

      expect(plan.vaultPath).toBe(vaultPath);
      expect(plan.port).toBe(4512);
      expect(plan.needsInstall).toBe(false);
      expect(plan.npmPath ?? null).toBeNull();
      expect(typeof plan.nodePath).toBe('string');
    } finally {
      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  });
});
