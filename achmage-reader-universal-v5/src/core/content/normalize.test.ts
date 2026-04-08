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
  it('turns Korean Obsidian wiki links into internal reader routes', () => {
    const snapshot: VaultSnapshot = {
      state: {
        rootPath: 'C:/vault',
        docCount: 2,
        lastIndexedAt: '2',
        watchStatus: 'sample',
        signature: 'sig-korean-wikilink',
      },
      files: [
        {
          filePath: 'C:/vault/notes/current.md',
          relativePath: 'notes/current.md',
          size: 1,
          mtimeMs: 1,
          content: `---
title: Current note
docType: note
outputs: [reader]
---

## Overview

[[옵시디언 문법 뭐에요]]
`,
        },
        {
          filePath: 'C:/vault/notes/obsidian-guide.md',
          relativePath: 'notes/obsidian-guide.md',
          size: 1,
          mtimeMs: 2,
          content: `---
title: 옵시디언 문법 뭐에요
slug: opsidian-guide
docType: note
outputs: [reader]
---

## Overview

대상 노트 본문
`,
        },
      ],
    };

    const {normalizedDocuments} = normalizeVaultSnapshot(snapshot);
    const currentDoc = normalizedDocuments.find((document) => document.slug === 'notes-current');
    const proseBlock = currentDoc?.sections[0]?.blocks.find((block) => block.kind === 'prose');

    expect(proseBlock?.kind).toBe('prose');
    expect(proseBlock && 'html' in proseBlock ? proseBlock.html : '').toContain(
      '<a href="?view=reader&#x26;doc=opsidian-guide">옵시디언 문법 뭐에요</a>',
    );
  });
});
