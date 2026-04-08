// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {createRichLineElements, type RichTextLine} from './rich-text';

const mountRichLines = (lines: RichTextLine[]) => {
  const doc = document.implementation.createHTMLDocument('rich-text-test');
  const root = doc.createElement('div');
  root.appendChild(createRichLineElements(doc, lines));
  doc.body.appendChild(root);
  return {doc, root};
};

describe('createRichLineElements', () => {
  it('renders linked overlay segments as anchors with href and data-href', () => {
    const lines: RichTextLine[] = [
      {
        text: 'Target note Example',
        segments: [
          {text: 'Target note', marks: ['link'], href: '?view=reader&doc=target-note'},
          {text: ' ', marks: []},
          {text: 'Example', marks: ['strong', 'link'], href: 'https://example.com'},
        ],
      },
    ];

    const {root} = mountRichLines(lines);
    const anchors = root.querySelectorAll('a.pretext-rich-segment');

    expect(anchors).toHaveLength(2);
    expect(anchors[0]?.getAttribute('href')).toBe('?view=reader&doc=target-note');
    expect(anchors[0]?.getAttribute('data-href')).toBe('?view=reader&doc=target-note');
    expect(anchors[0]?.classList.contains('pretext-rich-segment--link')).toBe(true);
    expect(anchors[1]?.getAttribute('href')).toBe('https://example.com');
    expect(anchors[1]?.getAttribute('data-href')).toBe('https://example.com');
    expect(anchors[1]?.classList.contains('pretext-rich-segment--strong')).toBe(true);
    expect(anchors[1]?.classList.contains('pretext-rich-segment--link')).toBe(true);
  });

  it('keeps non-linked overlay segments rendered as spans', () => {
    const lines: RichTextLine[] = [
      {
        text: 'plain code',
        segments: [
          {text: 'plain', marks: []},
          {text: ' ', marks: []},
          {text: 'code', marks: ['code']},
        ],
      },
    ];

    const {root} = mountRichLines(lines);
    const segments = Array.from(root.querySelectorAll('.pretext-rich-line > *'));

    expect(segments).toHaveLength(3);
    expect(segments.every((segment) => segment.tagName === 'SPAN')).toBe(true);
    expect(segments[2]?.classList.contains('pretext-rich-segment--code')).toBe(true);
  });
});
