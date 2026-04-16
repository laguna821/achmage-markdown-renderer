// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const contentMocks = vi.hoisted(() => ({
  buildHomeSearchEntries: vi.fn(() => []),
  buildHomeSearchTagCounts: vi.fn(() => []),
  parseHomeSearchExpression: vi.fn(() => ({
    raw: '',
    clauses: [],
    terms: [],
    textTerms: [],
    tagTerms: [],
    hasAnd: false,
    hasOr: false,
  })),
  prepareHomeSearchEntries: vi.fn(() => []),
  searchPreparedHomeEntries: vi.fn(() => []),
}));

vi.mock('../core/content', async () => {
  const actual = await vi.importActual<typeof import('../core/content')>('../core/content');
  return {
    ...actual,
    buildHomeSearchEntries: contentMocks.buildHomeSearchEntries,
    buildHomeSearchTagCounts: contentMocks.buildHomeSearchTagCounts,
    parseHomeSearchExpression: contentMocks.parseHomeSearchExpression,
    prepareHomeSearchEntries: contentMocks.prepareHomeSearchEntries,
    searchPreparedHomeEntries: contentMocks.searchPreparedHomeEntries,
  };
});

import type {NormalizedDoc, SourceDocument} from '../core/content';

import {HomeView} from './HomeView';

const doc: NormalizedDoc = {
  filePath: 'C:/vault/notes/sample.md',
  relativePath: 'notes/sample.md',
  sourceRoot: 'C:/vault',
  sourceDir: 'C:/vault/notes',
  slug: 'notes-sample',
  baseDepth: 2,
  headings: [],
  warnings: [],
  meta: {
    title: 'Sample',
    docType: 'note',
    outputs: ['reader'],
    theme: 'auto',
    tags: ['sample'],
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
  sections: [
    {
      id: 'lead',
      title: 'Overview',
      depth: 1,
      blocks: [{kind: 'prose', html: '<p>Sample</p>'}],
    },
  ],
};

const sourceDocument: SourceDocument = {
  filePath: doc.filePath,
  relativePath: doc.relativePath,
  sourceRoot: doc.sourceRoot,
  sourceDir: doc.sourceDir,
  body: 'Sample body',
  rawFrontmatter: {
    title: 'Sample',
    docType: 'note',
    outputs: ['reader'],
  },
  meta: doc.meta,
  warnings: [],
};

describe('HomeView', () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    contentMocks.buildHomeSearchEntries.mockClear();
    contentMocks.buildHomeSearchTagCounts.mockClear();
    contentMocks.parseHomeSearchExpression.mockClear();
    contentMocks.prepareHomeSearchEntries.mockClear();
    contentMocks.searchPreparedHomeEntries.mockClear();
  });

  afterEach(async () => {
    if (root) {
      const mountedRoot = root;
      await act(async () => {
        mountedRoot.unmount();
      });
      root = null;
    }
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('does not build the search index until the search field is focused', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <HomeView
          docs={[doc]}
          sourceDocuments={[sourceDocument]}
          selectedVaultPath="C:/vault"
          loading={false}
          searchState={{query: '', tags: []}}
          onSearchStateChange={() => undefined}
          onOpenDoc={() => undefined}
          onSelectVault={() => undefined}
          onRescan={() => undefined}
        />,
      );
    });

    expect(contentMocks.buildHomeSearchEntries).not.toHaveBeenCalled();
    expect(contentMocks.prepareHomeSearchEntries).not.toHaveBeenCalled();

    const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      searchInput?.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      await Promise.resolve();
    });

    expect(contentMocks.buildHomeSearchEntries).toHaveBeenCalledTimes(1);
    expect(contentMocks.prepareHomeSearchEntries).toHaveBeenCalledTimes(1);
  });
});
