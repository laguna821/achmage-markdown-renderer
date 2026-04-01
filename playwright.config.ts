import path from 'node:path';
import {defineConfig} from '@playwright/test';

const nodeDir = path.dirname(process.execPath);
const npmCommand = process.platform === 'win32' ? `"${path.join(nodeDir, 'npm.cmd')}"` : 'npm';
const pathEnv = `${nodeDir}${path.delimiter}${process.env.PATH ?? ''}`;
const docsRoot = path.resolve(process.cwd(), 'src/content/docs');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `${npmCommand} run dev -- --host 127.0.0.1 --port 4321`,
    env: {
      ...process.env,
      PATH: pathEnv,
      DOC_WORKSPACE_CONTENT_DIR: process.env.DOC_WORKSPACE_CONTENT_DIR ?? docsRoot,
    },
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
