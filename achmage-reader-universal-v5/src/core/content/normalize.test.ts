import {describe, expect, it} from 'vitest';

import {normalizeVaultSnapshot, type VaultSnapshot} from './index';

describe('normalizeVaultSnapshot', () => {
  it('preserves explicit Obsidian callout titles', () => {
    const snapshot: VaultSnapshot = {
      state: {
        rootPath: 'C:/vault',
        docCount: 1,
        lastIndexedAt: '1',
        watchStatus: 'sample',
        signature: 'sig',
      },
      files: [
        {
          filePath: 'C:/vault/notes/callout.md',
          relativePath: 'notes/callout.md',
          size: 1,
          mtimeMs: 1,
          content: `---
title: Callout Test
docType: note
outputs: [reader]
---

## Overview

> [!summary] 3줄 요약
> 핵심 포인트 하나
`,
        },
      ],
    };

    const {normalizedDocuments} = normalizeVaultSnapshot(snapshot);
    const calloutBlock = normalizedDocuments[0]?.sections[0]?.blocks[0];

    expect(calloutBlock?.kind).toBe('callout');
    expect(calloutBlock && 'title' in calloutBlock ? calloutBlock.title : '').toBe('3줄 요약');
  });
});
