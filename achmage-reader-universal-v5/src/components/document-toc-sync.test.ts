import {describe, expect, it} from 'vitest';

import {buildLiveHeadingSnapshot} from './document-toc-sync';

const createHeading = (id: string, tagName: string, top: number, text: string) => ({
  id,
  tagName,
  textContent: text,
  getBoundingClientRect: () => ({top}),
});

describe('document toc sync helpers', () => {
  it('keeps live article DOM order while filtering active candidates to ToC ids', () => {
    const {candidates, debugHeadings} = buildLiveHeadingSnapshot(
      [
        createHeading('section-1-2', 'H2', 180, '1.2 Paradigm Shift'),
        createHeading('callout-insight', 'H3', 260, "Professor Flow's Critical Insight"),
        createHeading('first-child', 'H3', 420, 'LILY는 숏폼인가, 롱폼인가?'),
        createHeading('second-child', 'H3', 760, 'Zoubeir Jlasssi는 누구인가?'),
        createHeading('third-child', 'H3', 1120, 'Life Context Engineering'),
      ],
      new Set(['section-1-2', 'first-child', 'second-child', 'third-child']),
    );

    expect(candidates.map((heading) => heading.id)).toEqual(['section-1-2', 'first-child', 'second-child', 'third-child']);
    expect(debugHeadings.find((heading) => heading.id === 'callout-insight')).toEqual(
      expect.objectContaining({
        isInToc: false,
        tagName: 'H3',
      }),
    );
  });
});
