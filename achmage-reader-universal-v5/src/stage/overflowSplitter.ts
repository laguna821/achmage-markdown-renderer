import type {NormalizedBlock, NormalizedDoc} from '../core/content';

import {
  DEFAULT_STAGE_TYPOGRAPHY,
  expandStageBlocks,
  measureStageBlockHeight,
  type StageTypographyConfig,
} from './pretextMeasurer';
import type {StageDeck, StageDeckOptions, StageFrame, StageGroup, StageLayoutIntent} from './types';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;
const DEFAULT_FRAME_HEIGHT = SLIDE_HEIGHT;
const DEFAULT_FRAME_WIDTH = SLIDE_WIDTH;
const DEFAULT_BLOCK_GAP = 28;
const SECTION_PADDING_V = 96;
const SECTION_PADDING_X = 64;
const UI_RESERVED_BOTTOM = 100;
const CONTINUED_HEADING_HEIGHT = 70;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const FOCUS_CARD_TARGET_OCCUPANCY = 0.76;
const FOCUS_CARD_MAX_BODY_OCCUPANCY = 0.92;
const FOCUS_CARD_MIN_SCALE = 1;
const FOCUS_CARD_MAX_SCALE = 1.38;
const DIRECT_FOCUS_CARD_KINDS = new Set<NormalizedBlock['kind']>([
  'callout',
  'docQuote',
  'evidencePanel',
  'thesis',
  'provenance',
  'log',
]);

const getTypography = (frameWidth: number): StageTypographyConfig => ({
  ...DEFAULT_STAGE_TYPOGRAPHY,
  contentWidth: Math.max(frameWidth - SECTION_PADDING_X * 2, 320),
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
    width: frameWidth - SECTION_PADDING_X * 2,
    weight: 760,
  });
  const metaCount = 1 + (doc.meta.heroLabel ? 1 : 0) + (doc.meta.date ? 1 : 0);
  const metaHeight = metaCount > 0 ? 42 : 0;
  const authorHeight = doc.meta.author ? 34 : 0;

  return 104 + metaHeight + titleHeight + authorHeight;
};

const measureGroupTitleHeight = (title: string, frameWidth: number, continued: boolean): number =>
  (continued ? 26 : 32) +
  measureTextBlock({
    text: title,
    fontSize: continued ? 34 : 38,
    lineHeight: continued ? 42 : 48,
    width: frameWidth - SECTION_PADDING_X * 2,
    weight: 720,
  }) +
  (continued ? 18 : 24);

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
  layoutIntent: includeDocumentHeader ? 'lead' : 'section-text',
  availableHeight: 0,
  occupancyRatio: 0,
});

const isImageFrame = (blocks: readonly NormalizedBlock[]): boolean => blocks.length > 0 && blocks.every((block) => block.kind === 'image');

const resolveLayoutIntent = ({
  kind,
  blocks,
}: {
  kind: 'lead' | 'section';
  blocks: readonly NormalizedBlock[];
}): StageLayoutIntent => {
  if (kind === 'lead') {
    return 'lead';
  }

  if (isImageFrame(blocks) || (blocks.length === 1 && blocks[0]?.kind === 'axisTable')) {
    return 'media';
  }

  return 'section-text';
};

const getFocusCardBlock = (blocks: readonly NormalizedBlock[]): NormalizedBlock | null => {
  if (blocks.length !== 1) {
    return null;
  }

  const [block] = blocks;
  if (!block) {
    return null;
  }

  if (DIRECT_FOCUS_CARD_KINDS.has(block.kind)) {
    return block;
  }

  if (block.kind === 'questionReset') {
    return block.items.length === 1 ? block : null;
  }

  if (block.kind === 'evidenceGrid') {
    return block.items.length === 1 ? block : null;
  }

  return null;
};

const resolveFocusCardScale = ({
  block,
  occupancyRatio,
  typography,
  frameHeight,
  frameWidth,
  availableHeight,
}: {
  block: NormalizedBlock;
  occupancyRatio: number;
  typography: StageTypographyConfig;
  frameHeight: number;
  frameWidth: number;
  availableHeight: number;
}): number => {
  let scale = clamp(
    FOCUS_CARD_TARGET_OCCUPANCY / Math.max(occupancyRatio, 0.01),
    FOCUS_CARD_MIN_SCALE,
    FOCUS_CARD_MAX_SCALE,
  );
  const maxScaledHeight = availableHeight * FOCUS_CARD_MAX_BODY_OCCUPANCY;

  while (scale > FOCUS_CARD_MIN_SCALE) {
    const scaledHeight = measureStageBlockHeight({
      block,
      typo: typography,
      frameHeight,
      frameWidth,
      focusScale: scale,
    });

    if (scaledHeight <= maxScaledHeight) {
      break;
    }

    scale = Math.max(FOCUS_CARD_MIN_SCALE, Number((scale - 0.02).toFixed(2)));
  }

  return Number(scale.toFixed(2));
};

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
  const contentWidth = Math.max(frameWidth - SECTION_PADDING_X * 2, 320);
  const typography = getTypography(frameWidth);
  const baseAvailable = frameHeight - SECTION_PADDING_V - UI_RESERVED_BOTTOM;
  const continuedHeadingReserve = Math.max(CONTINUED_HEADING_HEIGHT, measureGroupTitleHeight(title, frameWidth, true));
  const firstFrameAvailable =
    baseAvailable -
    (kind === 'lead'
      ? measureDocumentHeaderHeight(doc, frameWidth)
      : Math.max(CONTINUED_HEADING_HEIGHT + 8, measureGroupTitleHeight(title, frameWidth, false)));
  const continuedAvailable = baseAvailable - continuedHeadingReserve;

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
  const frameBodyHeights: number[] = [0];
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
    frameBodyHeights[frameIndex] = 0;
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
    frameBodyHeights[frameIndex] = currentHeight;

    if (dedicated && block !== expandedBlocks[expandedBlocks.length - 1]) {
      startNextFrame();
    }
  }

  return frames
    .filter((frame, index) => frame.blocks.length > 0 || index === 0)
    .map((frame, index) => {
      const availableHeight = index === 0 ? firstFrameAvailable : continuedAvailable;
      const occupancyRatio = clamp((frameBodyHeights[index] ?? 0) / Math.max(availableHeight, 1), 0, 1);
      const baseLayoutIntent = resolveLayoutIntent({
        kind,
        blocks: frame.blocks,
      });
      const focusCardBlock = baseLayoutIntent === 'media' || kind === 'lead' ? null : getFocusCardBlock(frame.blocks);
      const focusScale =
        focusCardBlock === null
          ? undefined
          : resolveFocusCardScale({
              block: focusCardBlock,
              occupancyRatio,
              typography,
              frameHeight,
              frameWidth: contentWidth,
              availableHeight,
            });

      return {
        ...frame,
        availableHeight,
        occupancyRatio,
        layoutIntent: baseLayoutIntent,
        focusScale,
      };
    });
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
