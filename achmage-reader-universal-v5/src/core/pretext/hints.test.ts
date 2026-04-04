import {describe, expect, it} from 'vitest';

import {resolveHeaderLayoutHints} from './hints';

describe('resolveHeaderLayoutHints', () => {
  it('disables reader header balancing for note documents', () => {
    expect(
      resolveHeaderLayoutHints('reader', {
        docType: 'note',
      }),
    ).toEqual([]);
  });

  it('keeps header balancing for non-note reader documents', () => {
    expect(
      resolveHeaderLayoutHints('reader', {
        docType: 'lecture',
      }),
    ).toHaveLength(1);
  });
});
