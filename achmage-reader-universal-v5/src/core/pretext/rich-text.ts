import type {LayoutCursor} from '@chenglou/pretext';

import type {InlineToken, RichBlockContent} from '../content';

export type RichTextMark = 'strong' | 'em' | 'code' | 'link' | 'badge';

export type RichTextSegment = {
  text: string;
  marks: readonly RichTextMark[];
  href?: string;
};

export type RichTextLine = {
  text: string;
  segments: RichTextSegment[];
};

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, {granularity: 'grapheme'}) : null;

const getGraphemeOffsets = (value: string): number[] => {
  if (!value) {
    return [0];
  }

  if (!segmenter) {
    return Array.from({length: value.length + 1}, (_, index) => index);
  }

  const offsets = [0];
  let offset = 0;

  for (const part of segmenter.segment(value)) {
    offset += part.segment.length;
    offsets.push(offset);
  }

  return offsets;
};

export const richTextToPlainText = (tokens: readonly InlineToken[]): string =>
  tokens
    .map((token) => {
      switch (token.kind) {
        case 'text':
        case 'code':
        case 'badge':
          return token.value;
        case 'strong':
        case 'em':
          return richTextToPlainText(token.children);
        case 'link':
          return richTextToPlainText(token.children);
        case 'br':
          return '\n';
      }
    })
    .join('');

export const buildRichTextSegments = (
  tokens: readonly InlineToken[],
  marks: readonly RichTextMark[] = [],
  href?: string,
): RichTextSegment[] => {
  const segments: RichTextSegment[] = [];

  for (const token of tokens) {
    switch (token.kind) {
      case 'text':
        if (token.value) {
          segments.push({text: token.value, marks, href});
        }
        break;
      case 'code':
        if (token.value) {
          segments.push({text: token.value, marks: [...marks, 'code'], href});
        }
        break;
      case 'badge':
        if (token.value) {
          segments.push({text: token.value, marks: [...marks, 'badge'], href});
        }
        break;
      case 'strong':
        segments.push(...buildRichTextSegments(token.children, [...marks, 'strong'], href));
        break;
      case 'em':
        segments.push(...buildRichTextSegments(token.children, [...marks, 'em'], href));
        break;
      case 'link':
        segments.push(...buildRichTextSegments(token.children, [...marks, 'link'], token.href));
        break;
      case 'br':
        segments.push({text: '\n', marks, href});
        break;
    }
  }

  return segments;
};

export const sliceRichTextSegments = (
  segments: readonly RichTextSegment[],
  startOffset: number,
  endOffset: number,
): RichTextSegment[] => {
  if (endOffset <= startOffset) {
    return [];
  }

  const sliced: RichTextSegment[] = [];
  let offset = 0;

  for (const segment of segments) {
    const nextOffset = offset + segment.text.length;
    if (nextOffset <= startOffset) {
      offset = nextOffset;
      continue;
    }

    if (offset >= endOffset) {
      break;
    }

    const sliceStart = Math.max(startOffset - offset, 0);
    const sliceEnd = Math.min(endOffset - offset, segment.text.length);
    const text = segment.text.slice(sliceStart, sliceEnd);

    if (text && text !== '\n') {
      sliced.push({
        ...segment,
        text,
      });
    }

    offset = nextOffset;
  }

  return sliced;
};

export const parseRichBlockContent = (value: string | undefined): RichBlockContent | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as RichBlockContent;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.plainText !== 'string' || !Array.isArray(parsed.tokens)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const cursorToTextOffset = (segments: string[], cursor: LayoutCursor): number => {
  let offset = 0;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex] ?? '';
    if (segmentIndex < cursor.segmentIndex) {
      offset += segment.length;
      continue;
    }

    if (segmentIndex === cursor.segmentIndex) {
      const graphemeOffsets = getGraphemeOffsets(segment);
      const graphemeOffset = graphemeOffsets[Math.min(cursor.graphemeIndex, graphemeOffsets.length - 1)] ?? segment.length;
      offset += graphemeOffset;
      break;
    }
  }

  return offset;
};

export const buildRichTextLines = ({
  content,
  preparedSegments,
  ranges,
}: {
  content: RichBlockContent;
  preparedSegments: string[];
  ranges: Array<{start: LayoutCursor; end: LayoutCursor}>;
}): RichTextLine[] => {
  const segments = buildRichTextSegments(content.tokens);

  return ranges.map((range) => {
    const startOffset = cursorToTextOffset(preparedSegments, range.start);
    const endOffset = cursorToTextOffset(preparedSegments, range.end);
    const lineSegments = sliceRichTextSegments(segments, startOffset, endOffset);

    return {
      text: lineSegments.map((segment) => segment.text).join(''),
      segments: lineSegments,
    };
  });
};

const applySegmentClasses = (element: HTMLElement, marks: readonly RichTextMark[]): void => {
  marks.forEach((mark) => {
    element.classList.add(`pretext-rich-segment--${mark}`);
    element.dataset.tokenKind = mark;
  });
};

export const createRichLineElements = (doc: Document, lines: RichTextLine[]): DocumentFragment => {
  const fragment = doc.createDocumentFragment();

  lines.forEach((line) => {
    const lineElement = doc.createElement('span');
    lineElement.className = 'pretext-rich-line';

    line.segments.forEach((segment) => {
      const segmentElement = doc.createElement('span');
      segmentElement.className = 'pretext-rich-segment';
      applySegmentClasses(segmentElement, segment.marks);
      if (segment.href) {
        segmentElement.dataset.href = segment.href;
      }
      segmentElement.textContent = segment.text;
      lineElement.appendChild(segmentElement);
    });

    fragment.appendChild(lineElement);
  });

  return fragment;
};
