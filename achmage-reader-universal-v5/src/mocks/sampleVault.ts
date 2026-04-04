import lectureBasic from './docs/lecture-basic.md?raw';
import newsletterBasic from './docs/newsletter-basic.md?raw';
import obsidianCallout from './docs/obsidian-callout.md?raw';

import type {VaultSnapshot} from '../core/content';

const rootPath = 'mock://achmage-vault';
const baseTime = Date.UTC(2026, 3, 4, 12, 0, 0);

export const SAMPLE_VAULT_SNAPSHOT: VaultSnapshot = {
  state: {
    rootPath,
    docCount: 3,
    lastIndexedAt: String(baseTime),
    watchStatus: 'sample',
    signature: 'sample-vault-signature',
  },
  files: [
    {
      filePath: `${rootPath}/40. Meaning (M)/402. Teaching Materials/lecture-basic.md`,
      relativePath: '40. Meaning (M)/402. Teaching Materials/lecture-basic.md',
      size: lectureBasic.length,
      mtimeMs: baseTime,
      content: lectureBasic,
    },
    {
      filePath: `${rootPath}/40. Meaning (M)/408. Shared/newsletter-basic.md`,
      relativePath: '40. Meaning (M)/408. Shared/newsletter-basic.md',
      size: newsletterBasic.length,
      mtimeMs: baseTime + 1,
      content: newsletterBasic,
    },
    {
      filePath: `${rootPath}/40. Meaning (M)/405. Labs/obsidian-callout.md`,
      relativePath: '40. Meaning (M)/405. Labs/obsidian-callout.md',
      size: obsidianCallout.length,
      mtimeMs: baseTime + 2,
      content: obsidianCallout,
    },
  ],
};

export const SAMPLE_APP_SETTINGS = {
  selectedVaultPath: rootPath,
  recentVaults: [rootPath],
  preferredTheme: 'light',
  lastOpenDoc: null,
  windowState: {
    width: 1440,
    height: 960,
  },
} as const;
