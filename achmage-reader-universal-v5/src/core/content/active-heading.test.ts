import {describe, expect, it} from 'vitest';

import {findActiveHeadingId, getActiveHeadingLine} from './active-heading';

describe('active heading helpers', () => {
  it('keeps the activation line near the top until late in the document', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 1000,
        scrollTop: 500,
        maxScroll: 4000,
      }),
    ).toBe(200);
  });

  it('selects the active heading by visual position even if the input order is mixed', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'h3-early', top: 780},
          {id: 'h2-current', top: 260},
          {id: 'h3-current', top: 420},
          {id: 'h2-next', top: 980},
        ],
        500,
      ),
    ).toBe('h3-current');
  });
});

