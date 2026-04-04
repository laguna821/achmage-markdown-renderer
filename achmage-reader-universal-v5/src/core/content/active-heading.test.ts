import {describe, expect, it} from 'vitest';

import {findActiveHeadingId} from './active-heading';

describe('active heading helpers', () => {
  it('defaults to the first heading before the activation offset reaches it', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'intro', top: 180},
          {id: 'chapter-1', top: 460},
        ],
        140,
      ),
    ).toBe('intro');
  });

  it('selects the active heading by document position even if the input order is mixed', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'h3-early', top: 7800},
          {id: 'h2-current', top: 1260},
          {id: 'h3-current', top: 1420},
          {id: 'h2-next', top: 1980},
        ],
        1500,
      ),
    ).toBe('h3-current');
  });

  it('advances through mixed h2 and h3 headings in document order without skipping ahead', () => {
    const headings = [
      {id: 'chapter-1', top: 680},
      {id: 'chapter-1-1', top: 1020},
      {id: 'chapter-1-2', top: 1380},
      {id: 'chapter-2', top: 1980},
    ];

    expect(findActiveHeadingId(headings, 740)).toBe('chapter-1');
    expect(findActiveHeadingId(headings, 1100)).toBe('chapter-1-1');
    expect(findActiveHeadingId(headings, 1440)).toBe('chapter-1-2');
  });

  it('pins to the last heading once the activation offset passes the full document', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'chapter-1', top: 760},
          {id: 'chapter-2', top: 1880},
          {id: 'chapter-3', top: 3120},
        ],
        5000,
      ),
    ).toBe('chapter-3');
  });
});
