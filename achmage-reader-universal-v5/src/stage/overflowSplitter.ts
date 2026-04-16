import type {NormalizedBlock, NormalizedDoc} from '../core/content';
import {deriveDocumentInsights} from '../lib/document-insights';

import {
  createStageTypographyConfig,
  expandStageBlocks,
  isStageHeadingProseBlock,
  measureStageBlockHeight,
  measureStageTextHeight,
  type StageTypographyConfig,
} from './pretextMeasurer';
import {getStageTypographyScale, resolveStageScalePreset} from './scale';
import type {StageDeck, StageDeckOptions, StageFrame, StageGroup, StageLayoutIntent, StageViewportBudget} from './types';

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 720;
const DEFAULT_BLOCK_GAP = 28;

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

export const DEFAULT_STAGE_VIEWPORT_BUDGET: StageViewportBudget = {
  width: DEFAULT_VIEWPORT_WIDTH,
  height: DEFAULT_VIEWPORT_HEIGHT,
  rightRailReserve: 72,
  bottomControlsReserve: 96,
  headingReserve: 84,
  continuedHeadingReserve: 72,
  blockGap: DEFAULT_BLOCK_GAP,
};

const resolveViewportBudget = (options: StageDeckOptions = {}): StageViewportBudget => ({
  width: Math.max(options.width ?? DEFAULT_STAGE_VIEWPORT_BUDGET.width, 640),
  height: Math.max(options.height ?? DEFAULT_STAGE_VIEWPORT_BUDGET.height, 420),
  rightRailReserve: Math.max(options.rightRailReserve ?? DEFAULT_STAGE_VIEWPORT_BUDGET.rightRailReserve, 0),
  bottomControlsReserve: Math.max(options.bottomControlsReserve ?? DEFAULT_STAGE_VIEWPORT_BUDGET.bottomControlsReserve, 0),
  headingReserve: Math.max(options.headingReserve ?? DEFAULT_STAGE_VIEWPORT_BUDGET.headingReserve, 0),
  continuedHeadingReserve: Math.max(
    options.continuedHeadingReserve ?? DEFAULT_STAGE_VIEWPORT_BUDGET.continuedHeadingReserve,
    0,
  ),
  blockGap: clamp(options.blockGap ?? DEFAULT_STAGE_VIEWPORT_BUDGET.blockGap ?? DEFAULT_BLOCK_GAP, 12, 48),
});

const getSurfacePadding = (budget: StageViewportBudget): number => {
  const preset = resolveStageScalePreset(budget);
  return getStageTypographyScale(preset).cardPadding;
};

const getUsableContentWidth = (budget: StageViewportBudget): number => {
  const surfacePadding = getSurfacePadding(budget);
  return Math.max(budget.width - budget.rightRailReserve - surfacePadding * 2, 320);
};

const getBaseBodyHeight = (budget: StageViewportBudget): number => {
  const surfacePadding = getSurfacePadding(budget);
  return Math.max(budget.height - budget.bottomControlsReserve - surfacePadding * 2, 180);
};

const getTypography = (budget: StageViewportBudget): StageTypographyConfig =>
  createStageTypographyConfig({
    preset: resolveStageScalePreset(budget),
    contentWidth: getUsableContentWidth(budget),
  });

const measureTextBlock = ({
  text,
  fontSize,
  lineHeight,
  width,
  typography,
  weight,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  width: number;
  typography: StageTypographyConfig;
  weight?: number;
}): number =>
  measureStageTextHeight({
    text,
    font: `${weight ?? typography.headingFontWeight} ${fontSize}px ${typography.headingFontFamily}`,
    width,
    lineHeight,
  });

const measureDocumentHeaderHeight = (doc: NormalizedDoc, typography: StageTypographyConfig): number => {
  const insights = deriveDocumentInsights(doc);
  const titleHeight = measureTextBlock({
    text: doc.meta.title,
    fontSize: typography.leadTitleFontSize,
    lineHeight: typography.leadTitleLineHeight,
    width: typography.leadTitleWidth,
    typography,
  });
  const metaHeight = insights.metaTrail.length > 0 ? typography.scale.metaLineHeight + typography.scale.surfaceGap : 0;
  const kickerHeight = typography.scale.kickerLineHeight + typography.scale.surfaceGap;
  const standfirstHeight = insights.standfirst
    ? measureTextBlock({
        text: insights.standfirst,
        fontSize: typography.scale.subheading,
        lineHeight: typography.scale.subheadingLineHeight,
        width: Math.min(typography.contentWidth, typography.listMeasureWidth),
        typography,
        weight: 650,
      }) + typography.scale.surfaceGap
    : 0;
  const authorHeight = doc.meta.author ? typography.scale.bodyLineHeight : 0;

  return metaHeight + kickerHeight + titleHeight + standfirstHeight + authorHeight + typography.scale.cardPadding;
};

const measureGroupTitleHeight = ({
  title,
  typography,
  continued,
}: {
  title: string;
  typography: StageTypographyConfig;
  continued: boolean;
}): number =>
  (continued ? typography.scale.surfaceGap : typography.scale.cardPadding) +
  measureTextBlock({
    text: title,
    fontSize: typography.sectionTitleFontSize,
    lineHeight: typography.sectionTitleLineHeight,
    width: typography.fullMeasureWidth,
    typography,
  }) +
  (continued ? typography.scale.surfaceGap : typography.scale.cardPadding);

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
  scalePreset: 'standard',
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
  availableHeight,
}: {
  block: NormalizedBlock;
  occupancyRatio: number;
  typography: StageTypographyConfig;
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
      frameHeight: availableHeight,
      frameWidth: typography.contentWidth,
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
  budget,
}: {
  doc: NormalizedDoc;
  groupId: string;
  title: string;
  kind: 'lead' | 'section';
  sectionId?: string;
  blocks: NormalizedBlock[];
  budget: StageViewportBudget;
}): StageFrame[] => {
  const expandedBlocks = expandStageBlocks(blocks);
  const typography = getTypography(budget);
  const baseAvailable = getBaseBodyHeight(budget);
  const scalePreset = resolveStageScalePreset(budget);
  const firstFrameHeadingReserve =
    kind === 'lead'
      ? measureDocumentHeaderHeight(doc, typography)
      : Math.max(
          budget.headingReserve,
          measureGroupTitleHeight({
            title,
            typography,
            continued: false,
          }),
        );
  const continuedHeadingReserve = Math.max(
    budget.continuedHeadingReserve,
    measureGroupTitleHeight({
      title,
      typography,
      continued: true,
    }),
  );
  const firstFrameAvailable = Math.max(baseAvailable - firstFrameHeadingReserve, 96);
  const continuedAvailable = Math.max(baseAvailable - continuedHeadingReserve, 96);

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
      frameHeight: baseAvailable,
      frameWidth: typography.contentWidth,
    });
    const startsSubsection = isStageHeadingProseBlock(block);
    const currentFrameHasBodyContent =
      frames[frameIndex]?.blocks.some((existingBlock) => !isStageHeadingProseBlock(existingBlock)) ?? false;

    if (startsSubsection && currentFrameHasBodyContent) {
      startNextFrame();
    }

    const gap = frames[frameIndex]?.blocks.length ? budget.blockGap ?? DEFAULT_BLOCK_GAP : 0;
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
    currentHeight += (frames[frameIndex]?.blocks.length ?? 0) > 1 ? budget.blockGap ?? DEFAULT_BLOCK_GAP : 0;
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
              availableHeight,
            });

      return {
        ...frame,
        availableHeight,
        occupancyRatio,
        layoutIntent: baseLayoutIntent,
        scalePreset,
        focusScale,
      };
    });
};

export const buildStageDeck = (doc: NormalizedDoc, options: StageDeckOptions = {}): StageDeck => {
  const budget = resolveViewportBudget(options);
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
      budget,
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
        budget,
      }),
    });
  }

  return {
    slug: doc.slug,
    title: doc.meta.title,
    keyboardNav: doc.meta.stage.keyboardNav,
    scalePreset: resolveStageScalePreset(budget),
    groups,
  };
};
