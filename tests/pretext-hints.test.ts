import {describe, expect, test} from 'vitest';

import {pretextConfig} from '../src/config/pretext';
import {
  buildPretextTargetAttributes,
  isPretextEnabledForOutput,
  resolveAxisTableLayoutHints,
  resolveBlockLayoutHints,
  resolveHeaderLayoutHints,
  resolveSectionLayoutHints,
} from '../src/lib/pretext/hints';

describe('pretext hint resolution', () => {
  test('enables Pretext for configured outputs by default', () => {
    expect(isPretextEnabledForOutput('reader')).toBe(true);
    expect(isPretextEnabledForOutput('stage')).toBe(true);
    expect(isPretextEnabledForOutput('newsletter')).toBe(true);
  });

  test('respects top-level config disable switch', () => {
    expect(
      isPretextEnabledForOutput('stage', {
        ...pretextConfig,
        enabled: false,
      }),
    ).toBe(false);
  });

  test('assigns balance-title to document headers', () => {
    expect(resolveHeaderLayoutHints('reader')).toEqual([
      expect.objectContaining({
        kind: 'balance-title',
        target: 'header',
        minLines: 2,
        maxLines: 3,
        preferredLines: 2,
      }),
    ]);
  });

  test('assigns the expected block hints for thesis, quote, and evidence grid', () => {
    expect(resolveBlockLayoutHints('thesis', 'reader')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({kind: 'balance-title', target: 'thesis'}),
        expect.objectContaining({kind: 'shrink-wrap', target: 'thesis'}),
      ]),
    );

    expect(resolveBlockLayoutHints('docQuote', 'reader')).toEqual([
      expect.objectContaining({kind: 'shrink-wrap', target: 'quote'}),
    ]);

    expect(resolveBlockLayoutHints('evidenceGrid', 'reader')).toEqual([
      expect.objectContaining({kind: 'measure-card', target: 'card-title', minColumns: 1, maxColumns: 3}),
    ]);
  });

  test('does not shrink-wrap thesis or quote blocks for reader note documents', () => {
    expect(
      resolveBlockLayoutHints('thesis', 'reader', {
        docType: 'note',
      }),
    ).toEqual([]);

    expect(
      resolveBlockLayoutHints('docQuote', 'reader', {
        docType: 'note',
      }),
    ).toEqual([]);
  });

  test('strengthens newsletter cover and quote hints while respecting document overrides', () => {
    expect(
      resolveHeaderLayoutHints('newsletter', {
        pretext: {
          heroPreferredLines: 3,
        },
      }),
    ).toEqual([
      expect.objectContaining({
        kind: 'balance-title',
        target: 'header',
        minLines: 2,
        maxLines: 4,
        preferredLines: 3,
      }),
    ]);

    expect(
      resolveBlockLayoutHints('evidenceGrid', 'newsletter', {
        pretext: {
          evidenceMinColumns: 2,
        },
      }),
    ).toEqual([
      expect.objectContaining({kind: 'measure-card', minColumns: 2, maxColumns: 3}),
    ]);

    expect(resolveBlockLayoutHints('docQuote', 'newsletter')).toEqual([
      expect.objectContaining({
        kind: 'shrink-wrap',
        target: 'quote',
        minLines: 2,
        maxLines: 4,
        preferredLines: 2,
      }),
    ]);
  });

  test('disables hints entirely when a document opts out of pretext', () => {
    expect(
      resolveHeaderLayoutHints('stage', {
        pretext: {
          disabled: true,
        },
      }),
    ).toEqual([]);
    expect(
      resolveBlockLayoutHints('thesis', 'stage', {
        pretext: {
          disabled: true,
        },
      }),
    ).toEqual([]);
  });

  test('returns Phase 2 section cover and axis-table hints for stage and newsletter outputs', () => {
    expect(resolveSectionLayoutHints('stage')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({kind: 'balance-title', target: 'section-cover'}),
        expect.objectContaining({kind: 'fit-screen', target: 'section-cover'}),
      ]),
    );

    expect(resolveAxisTableLayoutHints('reader')).toEqual([
      expect.objectContaining({kind: 'fit-screen', target: 'prose'}),
    ]);
  });

  test('serializes hint metadata into DOM attributes', () => {
    const [hint] = resolveHeaderLayoutHints('stage');
    const attrs = buildPretextTargetAttributes({
      slug: 'pretext-lab',
      hint,
      keySuffix: 'header:title',
    });

    expect(attrs).toMatchObject({
      'data-pretext': 'balance-title',
      'data-pretext-key': 'doc:pretext-lab:header:title',
      'data-pretext-target': 'header',
      'data-pretext-min-lines': '2',
      'data-pretext-max-lines': '3',
      'data-pretext-preferred-lines': '2',
    });
  });
});
