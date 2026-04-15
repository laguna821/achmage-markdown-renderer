import {layout, prepare} from '@chenglou/pretext';

import type {NormalizedBlock, NormalizedDoc, RichBlockContent} from '../content';

import type {StageDeck, StageDeckOptions, StageFrame, StageGroup} from './types';

const DEFAULT_FRAME_HEIGHT = 720;
const DEFAULT_FRAME_WIDTH = 1120;
const DEFAULT_BLOCK_GAP = 26;
const FRAME_PADDING_Y = 64;
const HEADER_SIDE_PADDING = 72;
const BODY_FONT = "'Pretendard Variable', 'Pretendard', 'Segoe UI', sans-serif";
const TEXT_CACHE = new Map<string, ReturnType<typeof prepare>>();

const getPrepared = (text: string, font: string): ReturnType<typeof prepare> => {
  const key = `${font}::${text}`;
  const cached = TEXT_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const next = prepare(text, font);
  TEXT_CACHE.set(key, next);
  return next;
};

const measureTextHeight = ({
  text,
  fontSize,
  lineHeight,
  width,
  weight = 400,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  width: number;
  weight?: number;
}): number => {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  try {
    const prepared = getPrepared(normalized, `${weight} ${fontSize}px ${BODY_FONT}`);
    return layout(prepared, Math.max(width, 1), lineHeight).height;
  } catch {
    const avgCharWidth = fontSize * 0.5;
    const charsPerLine = Math.max(Math.floor(width / Math.max(avgCharWidth, 1)), 1);
    return Math.ceil(normalized.length / charsPerLine) * lineHeight;
  }
};

const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|blockquote|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

const richText = (rich?: RichBlockContent, html?: string): string => rich?.plainText ?? stripHtml(html ?? '');

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const measureDocumentHeaderHeight = (doc: NormalizedDoc, frameWidth: number): number => {
  const titleHeight = measureTextHeight({
    text: doc.meta.title,
    fontSize: 54,
    lineHeight: 58,
    width: frameWidth - HEADER_SIDE_PADDING * 2,
    weight: 760,
  });
  const metaCount = 1 + (doc.meta.heroLabel ? 1 : 0) + (doc.meta.date ? 1 : 0);
  const metaHeight = metaCount > 0 ? 42 : 0;
  const authorHeight = doc.meta.author ? 34 : 0;

  return 92 + metaHeight + titleHeight + authorHeight;
};

const measureGroupTitleHeight = (title: string, frameWidth: number, continued: boolean): number =>
  28 +
  measureTextHeight({
    text: title,
    fontSize: continued ? 30 : 36,
    lineHeight: continued ? 36 : 42,
    width: frameWidth - HEADER_SIDE_PADDING * 2,
    weight: 720,
  }) +
  (continued ? 20 : 26);

const measureGridCardHeight = ({
  title,
  body,
  width,
}: {
  title: string;
  body: string;
  width: number;
}): number =>
  44 +
  measureTextHeight({
    text: title,
    fontSize: 23,
    lineHeight: 28,
    width,
    weight: 700,
  }) +
  measureTextHeight({
    text: body,
    fontSize: 22,
    lineHeight: 34,
    width,
  });

const measureStageBlock = (block: NormalizedBlock, frameWidth: number, frameHeight: number): number => {
  switch (block.kind) {
    case 'thesis':
      return (
        54 +
        measureTextHeight({
          text: richText(block.rich, block.content),
          fontSize: 31,
          lineHeight: 44,
          width: frameWidth - HEADER_SIDE_PADDING * 2,
          weight: 650,
        })
      );
    case 'docQuote':
      return (
        58 +
        measureTextHeight({
          text: richText(block.rich, block.content),
          fontSize: 27,
          lineHeight: 40,
          width: frameWidth - HEADER_SIDE_PADDING * 2 - 40,
          weight: 500,
        })
      );
    case 'prose':
      return (
        18 +
        measureTextHeight({
          text: stripHtml(block.html),
          fontSize: 24,
          lineHeight: 38,
          width: frameWidth - HEADER_SIDE_PADDING * 2,
        })
      );
    case 'questionReset':
      return (
        48 +
        block.items.reduce((sum, item) => {
          return (
            sum +
            measureTextHeight({
              text: item.title,
              fontSize: 24,
              lineHeight: 30,
              width: frameWidth - HEADER_SIDE_PADDING * 2,
              weight: 700,
            }) +
            measureTextHeight({
              text: stripHtml(item.body),
              fontSize: 22,
              lineHeight: 34,
              width: frameWidth - HEADER_SIDE_PADDING * 2,
            }) +
            20
          );
        }, 0)
      );
    case 'evidenceGrid': {
      const columns = clamp(block.items.length >= 3 ? 3 : block.items.length >= 2 ? 2 : 1, 1, 3);
      const cardWidth = (frameWidth - HEADER_SIDE_PADDING * 2 - (columns - 1) * 18) / columns;
      const rows = Math.ceil(block.items.length / columns);
      const cardHeights = block.items.map((item) =>
        measureGridCardHeight({
          title: item.title,
          body: stripHtml(item.body),
          width: cardWidth,
        }),
      );
      const rowHeights = Array.from({length: rows}, (_, rowIndex) =>
        Math.max(...cardHeights.slice(rowIndex * columns, rowIndex * columns + columns)),
      );
      return 28 + rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rows - 1) * 18;
    }
    case 'evidencePanel':
      return (
        42 +
        measureTextHeight({
          text: block.item.title,
          fontSize: 24,
          lineHeight: 30,
          width: frameWidth - HEADER_SIDE_PADDING * 2,
          weight: 700,
        }) +
        measureTextHeight({
          text: stripHtml(block.item.body),
          fontSize: 22,
          lineHeight: 34,
          width: frameWidth - HEADER_SIDE_PADDING * 2,
        })
      );
    case 'axisTable': {
      const columnCount = Math.max(block.headers.length, 1);
      const rowCount = Math.max(block.rows.length + 1, 1);
      const cellDensity = block.rows.flat().join(' ').length / Math.max(block.rows.length * columnCount, 1);
      const rowHeight = cellDensity > 70 ? 68 : cellDensity > 40 ? 56 : 46;
      return 54 + rowCount * rowHeight;
    }
    case 'log': {
      const lineCount = block.code.split(/\r?\n/).length;
      return 56 + lineCount * 28;
    }
    case 'provenance':
      return 150 + Math.max(block.ai.basedOn.length - 1, 0) * 18;
    case 'image':
      return Math.max(frameHeight * 0.52, 320);
  }
};

const proseFragmentPattern = /<(p|ul|ol|pre|table|blockquote|h[1-6])(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

const splitProseBlock = (block: Extract<NormalizedBlock, {kind: 'prose'}>): NormalizedBlock[] => {
  const matches = block.html.match(proseFragmentPattern);
  if (!matches || matches.length <= 1) {
    return [block];
  }

  return matches.map((html) => ({
    kind: 'prose',
    html,
  }));
};

const expandBlocks = (blocks: NormalizedBlock[]): NormalizedBlock[] =>
  blocks.flatMap((block) => (block.kind === 'prose' ? splitProseBlock(block) : [block]));

const isDedicatedFrameBlock = ({
  block,
  blockHeight,
  availableHeight,
}: {
  block: NormalizedBlock;
  blockHeight: number;
  availableHeight: number;
}): boolean => {
  if (block.kind === 'image') {
    return true;
  }

  return block.kind === 'axisTable' && blockHeight > availableHeight * 0.5;
};

const createFrame = ({
  groupId,
  frameIndex,
  title,
  includeDocumentHeader,
  continued,
}: {
  groupId: string;
  frameIndex: number;
  title: string;
  includeDocumentHeader: boolean;
  continued: boolean;
}): StageFrame => ({
  id: `${groupId}-frame-${frameIndex}`,
  title,
  continued,
  includeDocumentHeader,
  blocks: [],
});

const buildFramesForGroup = ({
  doc,
  groupId,
  title,
  kind,
  blocks,
  frameHeight,
  frameWidth,
  blockGap,
}: {
  doc: NormalizedDoc;
  groupId: string;
  title: string;
  kind: 'lead' | 'section';
  blocks: NormalizedBlock[];
  frameHeight: number;
  frameWidth: number;
  blockGap: number;
}): StageFrame[] => {
  const expandedBlocks = expandBlocks(blocks);
  const baseAvailable = frameHeight - FRAME_PADDING_Y * 2;
  const firstFrameAvailable =
    baseAvailable -
    (kind === 'lead' ? measureDocumentHeaderHeight(doc, frameWidth) : measureGroupTitleHeight(title, frameWidth, false));
  const continuedAvailable = baseAvailable - measureGroupTitleHeight(title, frameWidth, true);

  const frames: StageFrame[] = [
    createFrame({
      groupId,
      frameIndex: 0,
      title,
      includeDocumentHeader: kind === 'lead',
      continued: false,
    }),
  ];
  let frameIndex = 0;
  let currentHeight = 0;
  let currentAvailable = firstFrameAvailable;

  const startNextFrame = (): void => {
    frameIndex += 1;
    frames.push(
      createFrame({
        groupId,
        frameIndex,
        title,
        includeDocumentHeader: false,
        continued: true,
      }),
    );
    currentHeight = 0;
    currentAvailable = continuedAvailable;
  };

  for (const block of expandedBlocks) {
    const blockHeight = measureStageBlock(block, frameWidth, frameHeight);
    const gap = frames[frameIndex]?.blocks.length ? blockGap : 0;
    const dedicated = isDedicatedFrameBlock({
      block,
      blockHeight,
      availableHeight: currentAvailable,
    });

    if (dedicated && frames[frameIndex]?.blocks.length) {
      startNextFrame();
    }

    if (!dedicated && frames[frameIndex] && currentHeight + gap + blockHeight > currentAvailable && frames[frameIndex].blocks.length) {
      startNextFrame();
    }

    frames[frameIndex]?.blocks.push(block);
    currentHeight += (frames[frameIndex]?.blocks.length ?? 0) > 1 ? blockGap : 0;
    currentHeight += blockHeight;

    if (dedicated && block !== expandedBlocks[expandedBlocks.length - 1]) {
      startNextFrame();
    }
  }

  return frames.filter((frame, index) => frame.blocks.length > 0 || index === 0);
};

export const buildStageDeck = (doc: NormalizedDoc, options: StageDeckOptions = {}): StageDeck => {
  const frameHeight = options.frameHeight ?? DEFAULT_FRAME_HEIGHT;
  const frameWidth = options.frameWidth ?? DEFAULT_FRAME_WIDTH;
  const blockGap = options.blockGap ?? DEFAULT_BLOCK_GAP;
  const leadSection = doc.sections.find((section) => section.id === 'lead');
  const contentSections = doc.sections.filter((section) => section.id !== 'lead');
  const groups: StageGroup[] = [];

  groups.push({
    id: 'lead',
    title: doc.meta.title,
    kind: 'lead',
    sectionId: leadSection?.id,
    frames: buildFramesForGroup({
      doc,
      groupId: 'lead',
      title: doc.meta.title,
      kind: 'lead',
      blocks: leadSection?.blocks ?? [],
      frameHeight,
      frameWidth,
      blockGap,
    }),
  });

  for (const section of contentSections) {
    groups.push({
      id: section.id,
      title: section.title,
      kind: 'section',
      sectionId: section.id,
      frames: buildFramesForGroup({
        doc,
        groupId: section.id,
        title: section.title,
        kind: 'section',
        blocks: section.blocks,
        frameHeight,
        frameWidth,
        blockGap,
      }),
    });
  }

  return {
    slug: doc.slug,
    title: doc.meta.title,
    keyboardNav: doc.meta.stage.keyboardNav,
    groups,
  };
};
