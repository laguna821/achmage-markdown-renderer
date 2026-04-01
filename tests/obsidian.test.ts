import path from 'node:path';
import {describe, expect, test} from 'vitest';

import {OBSIDIAN_CALLOUT_MARKER, createObsidianLinkLookup, preprocessObsidianMarkdown} from '../src/lib/content/obsidian';
import {normalizeDocument, parseSourceFile} from '../src/lib/content';
import type {SourceDocument} from '../src/lib/content';

const fixturesRoot = path.resolve(process.cwd(), 'tests/fixtures');

const makeSource = (overrides: Partial<SourceDocument> = {}): SourceDocument => ({
  filePath: path.join(fixturesRoot, 'current.md'),
  relativePath: 'current.md',
  sourceRoot: fixturesRoot,
  sourceDir: fixturesRoot,
  body: '',
  rawFrontmatter: {},
  warnings: [],
  meta: {
    title: 'Current',
    slug: 'current',
    docType: 'note',
    outputs: ['reader'],
    theme: 'light',
    tags: [],
    toc: 'auto',
    tocMaxDepth: 'auto',
    tocTitle: 'TABLE_OF_CONTENTS',
    stage: {
      enabled: false,
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
  ...overrides,
});

describe('preprocessObsidianMarkdown', () => {
  test('converts wiki links, embeds, and callouts into markdown-friendly syntax', () => {
    const target = makeSource({
      filePath: path.join(fixturesRoot, 'target-note.md'),
      relativePath: 'target-note.md',
      meta: {
        ...makeSource().meta,
        title: 'Target Note',
        slug: 'target-note',
      },
      rawFrontmatter: {
        aliases: ['Alias Note'],
      },
    });
    const current = makeSource();
    const lookup = createObsidianLinkLookup([current, target]);

    const output = preprocessObsidianMarkdown(
      `See [[Target Note|that note]] and [[#Section Heading|jump]].\n\n![[image.png]]\n\n> [!Tip] Useful\n> 내용`,
      current,
      lookup,
    );

    expect(output).toContain('[that note](/reader/target-note)');
    expect(output).toContain('[jump](#section-heading)');
    expect(output).toContain('![](<image.png>)');
    expect(output).toContain('> **Tip - Useful**');
    expect(output).toContain(`<!--${OBSIDIAN_CALLOUT_MARKER}-->`);
  });

  test('parses plain markdown files with obsidian templater syntax without treating them as mdx', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'templater-note.md'),
      raw: `---
title: "Templater"
docType: "note"
outputs: ["reader"]
---

# Templater

{{"Write aphorism at the bottom"|callout:("Quote")}}
`,
      sourceRoot: fixturesRoot,
    });

    expect(() => normalizeDocument(parsed)).not.toThrow();
  });
});
