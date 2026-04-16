import {describe, expect, test} from 'vitest';

import {normalizeVaultSnapshot, type NormalizedBlock, type NormalizedDoc, type VaultSnapshot} from '../core/content';

import {buildStageDeck, getDocumentModeLinks, getDocumentsForStage} from './index';

const FULL_VIEWPORT_BUDGET = {
  width: 1440,
  height: 920,
  rightRailReserve: 72,
  bottomControlsReserve: 96,
  headingReserve: 84,
  continuedHeadingReserve: 72,
};

const makeSnapshot = (content: string, slug = 'stage-lab.md'): VaultSnapshot => ({
  state: {
    rootPath: 'C:/vault',
    docCount: 1,
    lastIndexedAt: '2026-04-15T00:00:00Z',
    watchStatus: 'ready',
    signature: `sig-${slug}`,
  },
  files: [
    {
      filePath: `C:/vault/${slug}`,
      relativePath: slug,
      size: content.length,
      mtimeMs: 1,
      content,
    },
  ],
});

const normalizeFixture = (content: string, slug?: string): NormalizedDoc => {
  const {normalizedDocuments} = normalizeVaultSnapshot(makeSnapshot(content, slug));
  const [doc] = normalizedDocuments;
  if (!doc) {
    throw new Error('document was not normalized');
  }

  return doc;
};

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
  filePath: `C:/vault/${slug}.md`,
  relativePath: `${slug}.md`,
  sourceRoot: 'C:/vault',
  sourceDir: 'C:/vault',
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

describe('desktop stage mode helpers', () => {
  test('returns every document for stage even when outputs omit stage', () => {
    const readerOnly = normalizeFixture(`---
title: Reader Only
docType: note
outputs: [reader]
---

## Overview

Reader only note
`);
    const lecture = normalizeFixture(`---
title: Lecture
docType: lecture
outputs: [reader, stage]
---

## Intro

Lecture note
`, 'lecture-stage.md');

    const stageDocs = getDocumentsForStage([readerOnly, lecture]);

    expect(stageDocs.map((doc) => doc.slug)).toEqual([readerOnly.slug, lecture.slug]);
  });

  test('always exposes stage links while preserving reader and newsletter availability', () => {
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
      {label: 'Reader', output: 'reader', href: '?view=reader&doc=stage-lab', active: false},
      {label: 'Stage', output: 'stage', href: '?view=stage&doc=stage-lab', active: true},
    ]);
    expect(getDocumentModeLinks(newsletterDoc, 'newsletter')).toEqual([
      {label: 'Reader', output: 'reader', href: '?view=reader&doc=weekly-brief', active: false},
      {label: 'Stage', output: 'stage', href: '?view=stage&doc=weekly-brief', active: false},
      {label: 'Newsletter', output: 'newsletter', href: '?view=newsletter&doc=weekly-brief', active: true},
    ]);
  });
});

describe('buildStageDeck', () => {
  test('builds a lead slide plus one horizontal group per normalized section', () => {
    const doc = normalizeFixture(`---
title: Lecture Basic
docType: note
outputs: [reader]
---

Lead copy.

## First section

Alpha

## Second section

Beta
`);

    const deck = buildStageDeck(doc);

    expect(deck.groups[0]).toMatchObject({
      id: 'lead',
      title: doc.meta.title,
      kind: 'lead',
    });
    expect(deck.groups.slice(1).map((group) => group.title)).toEqual(doc.sections.slice(1).map((section) => section.title));
    expect(deck.groups[0]?.frames[0]?.includeDocumentHeader).toBe(true);
    expect(deck.scalePreset).toBe('compact');
  });

  test('uses the first actual normalized section when source content starts at h3', () => {
    const doc = normalizeFixture(`---
title: H3 Start
docType: note
outputs: [reader]
---

Prelude.

### Deep start

First real section
`);

    const firstContentSection = doc.sections.find((section) => section.id !== 'lead');
    const deck = buildStageDeck(doc);

    expect(deck.groups).toHaveLength(2);
    expect(deck.groups[1]).toMatchObject({
      kind: 'section',
      title: firstContentSection?.title,
    });
  });

  test('keeps no-heading documents as a single lead-only stage group', () => {
    const doc = normalizeFixture(`---
title: No headings
docType: note
outputs: [reader]
---

Just body copy with no headings.
`);

    const deck = buildStageDeck(doc);

    expect(deck.groups).toHaveLength(1);
    expect(deck.groups[0]).toMatchObject({
      id: 'lead',
      title: doc.meta.title,
      kind: 'lead',
    });
  });

  test('marks empty lead frames as lead frames with packed body budget metadata', () => {
    const doc = makeDoc({
      sections: [{id: 'lead', title: 'Overview', depth: 1, blocks: []}],
    });

    const deck = buildStageDeck(doc);
    const leadFrame = deck.groups[0]?.frames[0];

    expect(leadFrame).toMatchObject({
      includeDocumentHeader: true,
      layoutIntent: 'lead',
      occupancyRatio: 0,
    });
    expect(leadFrame?.availableHeight).toBeGreaterThan(0);
  });

  test('classifies section-text and media frames while keeping packed body budgets', () => {
    const longParagraph = 'Dense stage paragraph '.repeat(140);
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'toc-like',
          title: 'Table of Contents',
          depth: 2,
          blocks: [
            {
              kind: 'prose',
              html: '<ul><li>One item</li><li>Two item</li><li>Three item</li><li>Four item</li></ul>',
            },
          ],
        },
        {
          id: 'image-group',
          title: 'Image Group',
          depth: 2,
          blocks: [{kind: 'image', src: '/assets/stage-lab.png', alt: 'Stage image'}],
        },
        {
          id: 'dense-group',
          title: 'Dense Group',
          depth: 2,
          blocks: [{kind: 'prose', html: `<p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p>`}],
        },
      ],
    });

    const deck = buildStageDeck(doc, FULL_VIEWPORT_BUDGET);

    const sparseFrame = deck.groups.find((group) => group.id === 'toc-like')?.frames[0];
    const imageFrame = deck.groups.find((group) => group.id === 'image-group')?.frames[0];
    const denseFrame = deck.groups.find((group) => group.id === 'dense-group')?.frames[0];

    expect(deck.scalePreset).toBe('standard');
    expect(sparseFrame?.layoutIntent).toBe('section-text');
    expect(sparseFrame?.scalePreset).toBe('standard');
    expect(sparseFrame?.availableHeight).toBeGreaterThan(0);
    expect(sparseFrame?.occupancyRatio).toBeLessThan(0.58);
    expect(imageFrame?.layoutIntent).toBe('media');
    expect(imageFrame?.availableHeight).toBeGreaterThan(0);
    expect(imageFrame?.occupancyRatio).toBeGreaterThan(0);
    expect(denseFrame?.layoutIntent).toBe('section-text');
    expect(denseFrame?.availableHeight).toBeGreaterThan(0);
    expect(denseFrame?.occupancyRatio).toBeGreaterThanOrEqual(0.58);
  });

  test('keeps solo card-like focus scaling as auxiliary metadata on section-text frames', () => {
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'summary',
          title: 'Summary',
          depth: 2,
          blocks: [{kind: 'callout', calloutType: 'summary', title: '3줄 요약', content: '<p>짧은 핵심 요약.</p>'}],
        },
        {
          id: 'quote',
          title: 'Quote',
          depth: 2,
          blocks: [{kind: 'docQuote', content: '<p>짧은 인용문.</p>'}],
        },
        {
          id: 'evidence-panel',
          title: 'Evidence',
          depth: 2,
          blocks: [{kind: 'evidencePanel', item: {title: 'Panel', body: '<p>짧은 근거.</p>'}}],
        },
      ],
    });

    const deck = buildStageDeck(doc, FULL_VIEWPORT_BUDGET);

    const summaryFrame = deck.groups.find((group) => group.id === 'summary')?.frames[0];
    const quoteFrame = deck.groups.find((group) => group.id === 'quote')?.frames[0];
    const panelFrame = deck.groups.find((group) => group.id === 'evidence-panel')?.frames[0];

    expect(summaryFrame?.layoutIntent).toBe('section-text');
    expect(summaryFrame?.focusScale).toBeGreaterThan(1);
    expect(summaryFrame?.focusScale).toBeLessThanOrEqual(1.38);
    expect(quoteFrame?.layoutIntent).toBe('section-text');
    expect(quoteFrame?.focusScale).toBeGreaterThan(1);
    expect(panelFrame?.layoutIntent).toBe('section-text');
    expect(panelFrame?.focusScale).toBeGreaterThan(1);
  });

  test('splits oversized card blocks into separate continued frames from measured height budgets', () => {
    const denseSummary = 'Summary point '.repeat(120);
    const denseQuote = 'Quoted line '.repeat(100);
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'summary-quote',
          title: 'Summary or Key Trigger',
          depth: 2,
          blocks: [
            {
              kind: 'callout',
              calloutType: 'summary',
              title: 'Summary',
              content: `<p>${denseSummary}</p><p>${denseSummary}</p>`,
            },
            {
              kind: 'docQuote',
              content: `<p>${denseQuote}</p><p>${denseQuote}</p>`,
            },
          ],
        },
      ],
    });

    const deck = buildStageDeck(doc, {
      ...FULL_VIEWPORT_BUDGET,
      width: 1120,
      height: 580,
    });
    const group = deck.groups.find((candidate) => candidate.id === 'summary-quote');

    expect(group?.frames).toHaveLength(2);
    expect(group?.frames[0]?.blocks).toHaveLength(1);
    expect(group?.frames[0]?.blocks[0]?.kind).toBe('callout');
    expect(group?.frames[1]?.blocks).toHaveLength(1);
    expect(group?.frames[1]?.blocks[0]?.kind).toBe('docQuote');
  });

  test('starts a new continued frame when an internal prose heading follows body content', () => {
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'subheading-lab',
          title: 'Subheading Lab',
          depth: 2,
          blocks: [
            {
              kind: 'prose',
              html: '<p>Opening paragraph.</p><h3>2.1 Hybrid format definition</h3><p>Follow-up paragraph.</p>',
            },
          ],
        },
      ],
    });

    const deck = buildStageDeck(doc, FULL_VIEWPORT_BUDGET);
    const group = deck.groups.find((candidate) => candidate.id === 'subheading-lab');

    expect(group?.frames).toHaveLength(2);
    expect(group?.frames[0]?.blocks).toHaveLength(1);
    expect(group?.frames[0]?.blocks[0]?.kind).toBe('prose');
    expect(group?.frames[1]?.blocks).toHaveLength(2);
    expect(group?.frames[1]?.blocks[0]?.kind).toBe('prose');
  });

  test('coerces image-only prose fragments into dedicated image frames', () => {
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'image-fragment-lab',
          title: 'Image Fragment Lab',
          depth: 2,
          blocks: [
            {kind: 'prose', html: '<p>Intro paragraph.</p><figure><img src="/assets/prose-image.png" alt="Fragment image" /><figcaption>Fragment caption</figcaption></figure><p>Outro paragraph.</p>'},
          ],
        },
      ],
    });

    const deck = buildStageDeck(doc, {
      ...FULL_VIEWPORT_BUDGET,
      width: 1120,
      height: 580,
    });
    const group = deck.groups.find((candidate) => candidate.id === 'image-fragment-lab');
    const kinds = group?.frames.flatMap((frame) => frame.blocks.map((block) => block.kind)) ?? [];

    expect(kinds).toEqual(['prose', 'image', 'prose']);
    expect(group?.frames.some((frame) => frame.blocks.length === 1 && frame.blocks[0]?.kind === 'image')).toBe(true);
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
      ...FULL_VIEWPORT_BUDGET,
      width: 1120,
      height: 580,
    });
    const group = deck.groups[1];
    const firstBudget = group.frames[0]?.availableHeight ?? 0;
    const continuedBudgets = group.frames.slice(1).map((frame) => frame.availableHeight);

    expect(group.frames.length).toBeGreaterThanOrEqual(4);
    expect(group.frames[1]?.continued).toBe(true);
    expect(firstBudget).not.toBe(continuedBudgets[0] ?? 0);
    expect(new Set(continuedBudgets).size).toBe(1);
    expect(group.frames.some((frame) => frame.blocks.length === 1 && frame.blocks[0]?.kind === 'image')).toBe(true);
    expect(group.frames.some((frame) => frame.blocks.length === 1 && frame.blocks[0]?.kind === 'axisTable')).toBe(true);
  });

  test('preserves block order across vertical pagination', () => {
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'order-lab',
          title: 'Order Lab',
          depth: 2,
          blocks: [
            {kind: 'prose', html: `<p>${'Intro '.repeat(120)}</p><p>${'More '.repeat(120)}</p>`},
            {kind: 'callout', calloutType: 'note', title: 'NOTE', content: `<p>${'Callout '.repeat(80)}</p>`},
            {kind: 'image', src: '/assets/order.png', alt: 'Order image'},
          ],
        },
      ],
    });

    const deck = buildStageDeck(doc, {
      ...FULL_VIEWPORT_BUDGET,
      width: 1120,
      height: 580,
    });
    const frames = deck.groups[1]?.frames ?? [];
    const kinds = frames.flatMap((frame) => frame.blocks.map((block) => block.kind));

    expect(kinds[0]).toBe('prose');
    expect(kinds).toContain('callout');
    expect(kinds[kinds.length - 1]).toBe('image');
  });

  test('re-computes packed body budgets when the viewport changes', () => {
    const longParagraph = 'Viewport-aware stage paragraph '.repeat(88);
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'viewport-lab',
          title: 'Viewport Lab',
          depth: 2,
          blocks: [
            {
              kind: 'prose',
              html: `<p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p><p>${longParagraph}</p>`,
            },
          ],
        },
      ],
    });

    const wideDeck = buildStageDeck(doc, {
      ...FULL_VIEWPORT_BUDGET,
      width: 1960,
      height: 980,
    });
    const narrowDeck = buildStageDeck(doc, {
      ...FULL_VIEWPORT_BUDGET,
      width: 760,
      height: 520,
    });

    const wideFirstFrame = wideDeck.groups.find((group) => group.id === 'viewport-lab')?.frames[0];
    const narrowFirstFrame = narrowDeck.groups.find((group) => group.id === 'viewport-lab')?.frames[0];

    expect(wideDeck.scalePreset).toBe('wide');
    expect(narrowDeck.scalePreset).toBe('compact');
    expect(wideFirstFrame?.scalePreset).toBe('wide');
    expect(narrowFirstFrame?.scalePreset).toBe('compact');
    expect(wideFirstFrame?.availableHeight).toBeGreaterThan(narrowFirstFrame?.availableHeight ?? 0);
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
