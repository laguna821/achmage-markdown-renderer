import type {NormalizedBlock, NormalizedDoc} from '../core/content';

import {
  DEFAULT_STAGE_TYPOGRAPHY,
  expandStageBlocks,
  measureStageBlockHeight,
  type StageTypographyConfig,
} from './pretextMeasurer';
import type {StageDeck, StageDeckOptions, StageFrame, StageGroup} from './types';

const DEFAULT_FRAME_HEIGHT = 720;
const DEFAULT_FRAME_WIDTH = 1120;
const DEFAULT_BLOCK_GAP = 26;
const FRAME_PADDING_Y = 64;
const HEADER_SIDE_PADDING = 72;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const getTypography = (frameWidth: number): StageTypographyConfig => ({
  ...DEFAULT_STAGE_TYPOGRAPHY,
  contentWidth: Math.max(frameWidth - HEADER_SIDE_PADDING * 2, 320),
});

const measureTextBlock = ({
  text,
  fontSize,
  lineHeight,
  width,
  weight = DEFAULT_STAGE_TYPOGRAPHY.headingFontWeight,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  width: number;
  weight?: number;
}): number =>
  measureStageBlockHeight({
    block: {
      kind: 'prose',
      html: `<p>${text}</p>`,
    },
    typo: {
      ...DEFAULT_STAGE_TYPOGRAPHY,
      bodyFont: `${weight} ${fontSize}px ${DEFAULT_STAGE_TYPOGRAPHY.headingFontFamily}`,
      bodyLineHeight: lineHeight,
      contentWidth: width,
    },
    frameHeight: DEFAULT_FRAME_HEIGHT,
    frameWidth: width,
  }) - 18;

const measureDocumentHeaderHeight = (doc: NormalizedDoc, frameWidth: number): number => {
  const titleHeight = measureTextBlock({
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
  measureTextBlock({
    text: title,
    fontSize: continued ? 30 : 36,
    lineHeight: continued ? 36 : 42,
    width: frameWidth - HEADER_SIDE_PADDING * 2,
    weight: 720,
  }) +
  (continued ? 20 : 26);

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
  sectionId,
}: {
  groupId: string;
  frameIndex: number;
  title: string;
  includeDocumentHeader: boolean;
  continued: boolean;
  sectionId?: string;
}): StageFrame => ({
  id: `${groupId}-frame-${frameIndex}`,
  title,
  continued,
  includeDocumentHeader,
  sectionId,
  sectionTitle: title,
  blocks: [],
});

const buildFramesForGroup = ({
  doc,
  groupId,
  title,
  kind,
  sectionId,
  blocks,
  frameHeight,
  frameWidth,
  blockGap,
}: {
  doc: NormalizedDoc;
  groupId: string;
  title: string;
  kind: 'lead' | 'section';
  sectionId?: string;
  blocks: NormalizedBlock[];
  frameHeight: number;
  frameWidth: number;
  blockGap: number;
}): StageFrame[] => {
  const expandedBlocks = expandStageBlocks(blocks);
  const contentWidth = Math.max(frameWidth - HEADER_SIDE_PADDING * 2, 320);
  const typography = getTypography(frameWidth);
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
      sectionId,
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
        sectionId,
      }),
    );
    currentHeight = 0;
    currentAvailable = continuedAvailable;
  };

  for (const block of expandedBlocks) {
    const blockHeight = measureStageBlockHeight({
      block,
      typo: typography,
      frameHeight,
      frameWidth: contentWidth,
    });
    const gap = frames[frameIndex]?.blocks.length ? blockGap : 0;
    const dedicated = isDedicatedFrameBlock({
      block,
      blockHeight,
      availableHeight: currentAvailable,
    });

    if (dedicated && frames[frameIndex]?.blocks.length) {
      startNextFrame();
    }

    if (
      !dedicated &&
      frames[frameIndex] &&
      currentHeight + gap + blockHeight > currentAvailable &&
      frames[frameIndex].blocks.length
    ) {
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
  const blockGap = clamp(options.blockGap ?? DEFAULT_BLOCK_GAP, 12, 48);
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
      sectionId: leadSection?.id,
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
        sectionId: section.id,
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
