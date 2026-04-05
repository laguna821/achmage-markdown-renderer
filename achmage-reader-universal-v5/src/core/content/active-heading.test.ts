import {describe, expect, it} from 'vitest';

import {findActiveHeadingId, getActiveHeadingLine} from './active-heading';

describe('active heading helpers', () => {
  it('uses the default 20 percent activation line away from the page bottom', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 1000,
        scrollTop: 400,
        maxScroll: 5000,
      }),
    ).toBe(200);
  });

  it('slides the activation line toward the bottom near the end of the page', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 1000,
        scrollTop: 4700,
        maxScroll: 5000,
      }),
    ).toBe(700);
  });

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

  it('keeps the provided DOM order instead of re-sorting headings', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'h2-current', top: 1260},
          {id: 'h3-current', top: 1420},
          {id: 'h2-next', top: 1980},
          {id: 'h3-early', top: 7800},
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
