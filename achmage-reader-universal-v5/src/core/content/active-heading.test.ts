import {describe, expect, it} from 'vitest';

import {findActiveHeadingId, getActiveHeadingLine, resolveActiveHeadingIndex} from './active-heading';

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

  it('steps one heading at a time through dense mixed heading clusters during normal downward scrolling', () => {
    const headings = [
      {id: 'chapter-1', top: 80},
      {id: 'chapter-1-1', top: 96},
      {id: 'chapter-1-2', top: 112},
      {id: 'chapter-1-3', top: 128},
      {id: 'chapter-2', top: 420},
    ];

    expect(
      resolveActiveHeadingIndex({
        headings,
        currentIndex: 0,
        previousScrollTop: 1200,
        currentScrollTop: 1240,
        activationLine: 140,
      }),
    ).toEqual({
      nextIndex: 1,
      targetIndex: 3,
      needsAnotherFrame: true,
    });

    expect(
      resolveActiveHeadingIndex({
        headings,
        currentIndex: 1,
        previousScrollTop: 1240,
        currentScrollTop: 1240,
        activationLine: 140,
      }),
    ).toEqual({
      nextIndex: 2,
      targetIndex: 3,
      needsAnotherFrame: true,
    });
  });

  it('steps back one heading at a time through dense mixed heading clusters during reverse scrolling', () => {
    const headings = [
      {id: 'chapter-1', top: -240},
      {id: 'chapter-1-1', top: -180},
      {id: 'chapter-1-2', top: -120},
      {id: 'chapter-1-3', top: -60},
      {id: 'chapter-2', top: 260},
    ];

    expect(
      resolveActiveHeadingIndex({
        headings,
        currentIndex: 3,
        previousScrollTop: 1720,
        currentScrollTop: 1680,
        activationLine: -100,
      }),
    ).toEqual({
      nextIndex: 2,
      targetIndex: 2,
      needsAnotherFrame: false,
    });
  });

  it('snaps directly to the far target for forced or large-jump syncs', () => {
    const headings = [
      {id: 'chapter-1', top: 80},
      {id: 'chapter-1-1', top: 96},
      {id: 'chapter-1-2', top: 112},
      {id: 'chapter-1-3', top: 128},
      {id: 'chapter-2', top: 420},
    ];

    expect(
      resolveActiveHeadingIndex({
        headings,
        currentIndex: 0,
        previousScrollTop: 0,
        currentScrollTop: 1600,
        activationLine: 140,
        largeJumpThreshold: 800,
      }),
    ).toEqual({
      nextIndex: 3,
      targetIndex: 3,
      needsAnotherFrame: false,
    });

    expect(
      resolveActiveHeadingIndex({
        headings,
        currentIndex: 0,
        previousScrollTop: 1200,
        currentScrollTop: 1240,
        activationLine: 140,
        forceSnap: true,
      }),
    ).toEqual({
      nextIndex: 3,
      targetIndex: 3,
      needsAnotherFrame: false,
    });
  });
});
