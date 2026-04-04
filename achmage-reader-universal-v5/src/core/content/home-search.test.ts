import {describe, expect, it} from 'vitest';

import {buildHomeSearchEntries, prepareHomeSearchEntries, searchPreparedHomeEntries, type SourceDocument} from './index';

const sourceDocument: SourceDocument = {
  filePath: 'C:/vault/notes/sample.md',
  relativePath: 'notes/sample.md',
  sourceRoot: 'C:/vault',
  sourceDir: 'C:/vault/notes',
  body: 'AI literacy is rooted in context design. #lecture',
  rawFrontmatter: {
    title: 'AI 리터러시 강의 노트',
    docType: 'lecture',
    outputs: ['reader', 'stage'],
    tags: ['ai', 'context'],
  },
  meta: {
    title: 'AI 리터러시 강의 노트',
    docType: 'lecture',
    outputs: ['reader', 'stage'],
    theme: 'auto',
    tags: ['ai', 'context'],
    toc: 'auto',
    tocMaxDepth: 'auto',
    tocTitle: 'TABLE_OF_CONTENTS',
    stage: {
      enabled: true,
      focusMode: true,
      keyboardNav: true,
      revealLists: false,
    },
    rail: {
      showMetadata: true,
      showTags: true,
      showToc: true,
    },
  },
  warnings: [],
};

describe('home search', () => {
  it('matches text and tag queries together', () => {
    const entries = buildHomeSearchEntries([sourceDocument]);
    const results = searchPreparedHomeEntries(prepareHomeSearchEntries(entries), {
      query: 'AI AND #lecture',
      tags: [],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.matchedFields).toContain('title');
    expect(results[0]?.matchedFields).toContain('tag');
  });
});
