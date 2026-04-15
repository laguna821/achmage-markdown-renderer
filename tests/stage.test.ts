import path from 'node:path';
import {describe, expect, test} from 'vitest';

import {normalizeDocument} from '../src/lib/content/normalize';
import {parseSourceFile} from '../src/lib/content/source';
import type {NormalizedBlock, NormalizedDoc} from '../src/lib/content/types';
import {buildStageDeck, getDocumentModeLinks, getDocumentsForStage} from '../src/lib/stage';

const fixturesRoot = path.resolve(process.cwd(), 'tests/fixtures');

const parseFixture = (fixtureName: string): NormalizedDoc =>
  normalizeDocument(
    parseSourceFile({
      filePath: path.join(fixturesRoot, fixtureName),
      sourceRoot: fixturesRoot,
    }),
  );

const makeDoc = ({
  slug = 'stage-lab',
  title = 'Stage Lab',
  outputs = ['reader'] as Array<'reader' | 'stage' | 'newsletter'>,
  keyboardNav = true,
  sections,
}: {
  slug?: string;
  title?: string;
  outputs?: Array<'reader' | 'stage' | 'newsletter'>;
  keyboardNav?: boolean;
  sections: NormalizedDoc['sections'];
}): NormalizedDoc => ({
  filePath: path.join(fixturesRoot, `${slug}.md`),
  relativePath: `${slug}.md`,
  slug,
  baseDepth: 2,
  headings: [],
  warnings: [],
  meta: {
    title,
    docType: 'note',
    outputs,
    theme: 'light',
    tags: [],
    toc: 'auto',
    tocMaxDepth: 'auto',
    tocTitle: 'TABLE_OF_CONTENTS',
    stage: {
      enabled: true,
      focusMode: true,
      keyboardNav,
      revealLists: false,
    },
    rail: {
      showMetadata: true,
      showTags: true,
      showToc: true,
    },
  },
  sections,
});

describe('stage mode helpers', () => {
  test('returns every document for stage routes even when outputs omit stage', () => {
    const readerOnly = parseFixture('no-headings.md');
    const lecture = parseFixture('lecture-basic.md');

    const stageDocs = getDocumentsForStage([readerOnly, lecture]);

    expect(stageDocs.map((doc) => doc.slug)).toEqual([readerOnly.slug, lecture.slug]);
  });

  test('always exposes stage links while preserving conditional reader and newsletter links', () => {
    const noteDoc = makeDoc({
      outputs: ['reader'],
      sections: [{id: 'lead', title: 'Overview', depth: 1, blocks: []}],
    });
    const newsletterDoc = makeDoc({
      slug: 'weekly-brief',
      outputs: ['reader', 'newsletter'],
      sections: [{id: 'lead', title: 'Overview', depth: 1, blocks: []}],
    });

    expect(getDocumentModeLinks(noteDoc, 'stage')).toEqual([
      {label: 'Reader', href: '/reader/stage-lab', active: false},
      {label: 'Stage', href: '/stage/stage-lab', active: true},
    ]);
    expect(getDocumentModeLinks(newsletterDoc, 'newsletter')).toEqual([
      {label: 'Reader', href: '/reader/weekly-brief', active: false},
      {label: 'Stage', href: '/stage/weekly-brief', active: false},
      {label: 'Newsletter', href: '/newsletter/weekly-brief', active: true},
    ]);
  });
});

describe('buildStageDeck', () => {
  test('builds a lead slide plus one horizontal group per normalized section', () => {
    const doc = parseFixture('lecture-basic.md');

    const deck = buildStageDeck(doc);

    expect(deck.groups[0]).toMatchObject({
      id: 'lead',
      title: doc.meta.title,
      kind: 'lead',
    });
    expect(deck.groups.slice(1).map((group) => group.title)).toEqual(doc.sections.slice(1).map((section) => section.title));
    expect(deck.groups[0]?.frames[0]?.includeDocumentHeader).toBe(true);
  });

  test('uses the first actual normalized section when source content starts at h3', () => {
    const doc = parseFixture('lecture-starts-at-h3.md');
    const firstContentSection = doc.sections.find((section) => section.id !== 'lead');

    const deck = buildStageDeck(doc);

    expect(deck.groups).toHaveLength(2);
    expect(deck.groups[1]).toMatchObject({
      kind: 'section',
      title: firstContentSection?.title,
    });
  });

  test('keeps no-heading documents as a single lead-only stage group', () => {
    const doc = parseFixture('no-headings.md');

    const deck = buildStageDeck(doc);

    expect(deck.groups).toHaveLength(1);
    expect(deck.groups[0]).toMatchObject({
      id: 'lead',
      title: doc.meta.title,
      kind: 'lead',
    });
  });

  test('splits long prose into continued frames while isolating images and dense tables', () => {
    const longParagraph = 'A long paragraph for pagination. '.repeat(90);
    const longProse: NormalizedBlock = {
      kind: 'prose',
      html: `<p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p>`,
    };
    const imageBlock: NormalizedBlock = {
      kind: 'image',
      src: '/assets/stage-lab.png',
      alt: 'Stage image',
    };
    const denseTable: NormalizedBlock = {
      kind: 'axisTable',
      headers: ['Axis', 'Mode A', 'Mode B', 'Mode C'],
      rows: Array.from({length: 8}, (_, index) => [
        `Row ${index + 1}`,
        'Dense comparison content '.repeat(6),
        'Dense comparison content '.repeat(6),
        'Dense comparison content '.repeat(6),
      ]),
    };
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {id: 'long-section', title: 'Long Section', depth: 2, blocks: [longProse, imageBlock, denseTable]},
      ],
    });

    const deck = buildStageDeck(doc, {
      frameHeight: 430,
      frameWidth: 960,
    });
    const group = deck.groups[1];

    expect(group.frames.length).toBeGreaterThanOrEqual(4);
    expect(group.frames[1]?.continued).toBe(true);
    expect(group.frames.some((frame) => frame.blocks.length === 1 && frame.blocks[0]?.kind === 'image')).toBe(true);
    expect(group.frames.some((frame) => frame.blocks.length === 1 && frame.blocks[0]?.kind === 'axisTable')).toBe(true);
  });

  test('propagates keyboard navigation settings from document frontmatter', () => {
    const doc = makeDoc({
      keyboardNav: false,
      sections: [{id: 'lead', title: 'Overview', depth: 1, blocks: []}],
    });

    const deck = buildStageDeck(doc);

    expect(deck.keyboardNav).toBe(false);
  });
});
