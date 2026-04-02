import {describe, expect, test} from 'vitest';

import {findActiveHeadingId, getActiveHeadingLine} from '../src/lib/content/active-heading';

describe('getActiveHeadingLine', () => {
  test('keeps a stable top activation line through the main scroll range', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 800,
        scrollTop: 400,
        maxScroll: 2400,
      }),
    ).toBe(160);
  });

  test('slides the activation line downward near the document bottom', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 800,
        scrollTop: 200,
        maxScroll: 200,
      }),
    ).toBe(800);
  });

  test('keeps the default activation line when the document cannot scroll at all', () => {
    expect(
      getActiveHeadingLine({
        viewportHeight: 800,
        scrollTop: 0,
        maxScroll: 0,
      }),
    ).toBe(160);
  });
});

describe('findActiveHeadingId', () => {
  test('keeps the current heading active until the next heading reaches the activation line', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'section-1', top: -320},
          {id: 'section-2', top: 840},
        ],
        160,
      ),
    ).toBe('section-1');
  });

  test('switches to the next heading once it reaches the activation line', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'section-1', top: -640},
          {id: 'section-2', top: 120},
        ],
        160,
      ),
    ).toBe('section-2');
  });

  test('defaults to the first heading before any heading crosses the activation line', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'section-1', top: 220},
          {id: 'section-2', top: 1180},
        ],
        160,
      ),
    ).toBe('section-1');
  });

  test('can activate later headings near the document bottom even if they never reach the default top line', () => {
    expect(
      findActiveHeadingId(
        [
          {id: 'section-1', top: -180},
          {id: 'section-2', top: 520},
        ],
        800,
      ),
    ).toBe('section-2');
  });
});
