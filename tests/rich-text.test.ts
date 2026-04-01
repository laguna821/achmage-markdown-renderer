import {describe, expect, test} from 'vitest';

import {parseMarkdown, extractInlineTokens} from '../src/lib/content/markdown';
import {
  buildRichTextSegments,
  richTextToPlainText,
  sliceRichTextSegments,
} from '../src/lib/pretext/rich-text';
import type {MdNode} from '../src/lib/content';

describe('rich text helpers', () => {
  test('extracts inline tokens for emphasis, code, links, and hard breaks', () => {
    const tree = parseMarkdown('A **bold** move with `code`, [docs](https://example.com), and  \nnext line.');
    const paragraph = tree.children[0] as MdNode;
    const tokens = extractInlineTokens(paragraph.children ?? []);

    expect(tokens).toEqual([
      {kind: 'text', value: 'A '},
      {kind: 'strong', children: [{kind: 'text', value: 'bold'}]},
      {kind: 'text', value: ' move with '},
      {kind: 'code', value: 'code'},
      {kind: 'text', value: ', '},
      {kind: 'link', href: 'https://example.com', children: [{kind: 'text', value: 'docs'}]},
      {kind: 'text', value: ', and'},
      {kind: 'br'},
      {kind: 'text', value: 'next line.'},
    ]);
  });

  test('slices flattened rich segments by text offsets without losing marks', () => {
    const tokens = [
      {kind: 'text', value: 'A '},
      {kind: 'strong', children: [{kind: 'text', value: 'bold'}]},
      {kind: 'text', value: ' move'},
      {kind: 'code', value: ' fn()'},
    ] as const;

    expect(richTextToPlainText(tokens)).toBe('A bold move fn()');

    const segments = buildRichTextSegments(tokens);
    expect(sliceRichTextSegments(segments, 2, 11)).toEqual([
      expect.objectContaining({text: 'bold', marks: ['strong']}),
      expect.objectContaining({text: ' move', marks: []}),
    ]);
  });
});
