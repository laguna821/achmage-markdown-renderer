import {describe, expect, it, vi} from 'vitest';

import type {VaultFileBatch, VaultScan} from './types';
import {loadVaultDocuments} from './vault-loader';

const makeScan = (relativePaths: string[]): VaultScan => ({
  state: {
    rootPath: 'C:/vault',
    docCount: relativePaths.length,
    lastIndexedAt: '1',
    watchStatus: 'polling',
    signature: 'sig',
  },
  files: relativePaths.map((relativePath, index) => ({
    filePath: `C:/vault/${relativePath}`,
    relativePath,
    size: 100 + index,
    mtimeMs: index + 1,
  })),
});

const makeBatch = (entries: Record<string, string>): VaultFileBatch => ({
  files: Object.entries(entries).map(([relativePath, content]) => ({relativePath, content})),
});

describe('loadVaultDocuments', () => {
  it('validates scanned files in batches and reports a ready load state', async () => {
    const scan = makeScan(['notes/alpha.md', 'notes/beta.md']);
    const progressStates: string[] = [];
    const readVaultBatch = vi
      .fn<(_: string, relativePaths: string[]) => Promise<VaultFileBatch>>()
      .mockImplementation(async (_rootPath, relativePaths) =>
        makeBatch(
          Object.fromEntries(
            relativePaths.map((relativePath) => [
              relativePath,
              `---
title: ${relativePath}
docType: note
outputs: [reader]
---

## Overview

Ready`,
            ]),
          ),
        ),
      );

    const result = await loadVaultDocuments({
      rootPath: 'C:/vault',
      scan,
      batchSize: 1,
      readVaultBatch,
      onProgress: (state) => {
        progressStates.push(state.phase);
      },
    });

    expect(readVaultBatch).toHaveBeenCalledTimes(2);
    expect(progressStates).toContain('validating');
    expect(result.loadState.phase).toBe('ready');
    expect(result.loadState.validatedFiles).toBe(2);
    expect(result.documents).toHaveLength(2);
  });

  it('blocks the vault when malformed frontmatter is found', async () => {
    const scan = makeScan(['notes/broken.md']);

    const result = await loadVaultDocuments({
      rootPath: 'C:/vault',
      scan,
      readVaultBatch: async () =>
        makeBatch({
          'notes/broken.md': `---
title: Broken
docType: note
outputs: [reader
---

## Overview

Broken`,
        }),
    });

    expect(result.loadState.phase).toBe('blocked');
    expect(result.loadState.fatalCount).toBeGreaterThan(0);
    expect(result.loadState.firstFatalErrors[0]?.stage).toBe('frontmatter');
    expect(result.documents).toHaveLength(0);
  });

  it('reports slug collisions for flattening conflicts', async () => {
    const scan = makeScan(['A/B.md', 'A-B.md']);

    const result = await loadVaultDocuments({
      rootPath: 'C:/vault',
      scan,
      readVaultBatch: async (_rootPath, relativePaths) =>
        makeBatch(
          Object.fromEntries(
            relativePaths.map((relativePath) => [
              relativePath,
              `---
title: ${relativePath}
docType: note
outputs: [reader]
---

## Overview

Slug collision`,
            ]),
          ),
        ),
    });

    expect(result.loadState.phase).toBe('blocked');
    expect(result.loadState.firstFatalErrors[0]?.stage).toBe('slug');
    expect(result.loadState.firstFatalErrors[0]?.message).toContain('A/B.md');
    expect(result.loadState.firstFatalErrors[0]?.message).toContain('A-B.md');
  });

  it('classifies invalid mdx documents as markdown-stage fatals', async () => {
    const scan = makeScan(['notes/broken.mdx']);

    const result = await loadVaultDocuments({
      rootPath: 'C:/vault',
      scan,
      readVaultBatch: async () =>
        makeBatch({
          'notes/broken.mdx': `---
title: Broken MDX
docType: note
outputs: [reader]
---

<Broken`,
        }),
    });

    expect(result.loadState.phase).toBe('blocked');
    expect(result.loadState.firstFatalErrors[0]?.stage).toBe('markdown');
  });

  it('chunks a 10000-file scan into 100-file validation batches', async () => {
    const scan = makeScan(Array.from({length: 10000}, (_, index) => `notes/doc-${index + 1}.md`));
    const readVaultBatch = vi
      .fn<(_: string, relativePaths: string[]) => Promise<VaultFileBatch>>()
      .mockImplementation(async (_rootPath, relativePaths) =>
        makeBatch(
          Object.fromEntries(
            relativePaths.map((relativePath) => [
              relativePath,
              `---
title: ${relativePath}
docType: note
outputs: [reader]
---

## Overview

Synthetic`,
            ]),
          ),
        ),
      );

    const result = await loadVaultDocuments({
      rootPath: 'C:/vault',
      scan,
      batchSize: 100,
      readVaultBatch,
    });

    expect(readVaultBatch).toHaveBeenCalledTimes(100);
    expect(result.loadState.phase).toBe('ready');
    expect(result.loadState.totalFiles).toBe(10000);
    expect(result.loadState.validatedFiles).toBe(10000);
  }, 30_000);
});
