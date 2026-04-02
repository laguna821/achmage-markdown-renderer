import {describe, expect, test} from 'vitest';

import {normalizeFrontmatter} from '../src/lib/content/schema';

describe('normalizeFrontmatter', () => {
  test('accepts the aurora theme mode', () => {
    const {meta, warnings} = normalizeFrontmatter({
      title: 'Phase 2 Lab',
      docType: 'note',
      outputs: ['reader'],
      theme: 'aurora',
    });

    expect(warnings).toEqual([]);
    expect(meta.theme).toBe('aurora');
  });

  test('accepts the cyber_sanctuary theme mode', () => {
    const {meta, warnings} = normalizeFrontmatter({
      title: 'Sanctuary Protocol',
      docType: 'note',
      outputs: ['reader'],
      theme: 'cyber_sanctuary',
    });

    expect(warnings).toEqual([]);
    expect(meta.theme).toBe('cyber_sanctuary');
  });

  test('parses optional pretext overrides', () => {
    const {meta, warnings} = normalizeFrontmatter({
      title: 'Phase 2 Lab',
      docType: 'newsletter',
      outputs: ['reader', 'newsletter'],
      pretext: {
        heroPreferredLines: 3,
        thesisMaxLines: 5,
        evidenceMinColumns: 2,
        forceWrapFigure: true,
      },
    });

    expect(warnings).toEqual([]);
    expect(meta.pretext).toEqual({
      disabled: false,
      heroPreferredLines: 3,
      thesisMaxLines: 5,
      evidenceMinColumns: 2,
      forceWrapFigure: true,
    });
  });

  test('ignores invalid pretext overrides while preserving the rest of the document contract', () => {
    const {meta, warnings} = normalizeFrontmatter({
      title: 'Phase 2 Lab',
      docType: 'lecture',
      outputs: ['reader', 'stage'],
      pretext: {
        heroPreferredLines: 9,
      },
    });

    expect(meta.docType).toBe('lecture');
    expect(meta.outputs).toEqual(['reader', 'stage']);
    expect(meta.pretext).toBeUndefined();
    expect(warnings).toContain('Invalid optional field "pretext" was ignored.');
  });
});
