export type StageScalePreset = 'compact' | 'standard' | 'wide';

export type StageTypographyScale = {
  leadTitle: number;
  leadTitleLineHeight: number;
  sectionTitle: number;
  sectionTitleLineHeight: number;
  body: number;
  bodyLineHeight: number;
  list: number;
  listLineHeight: number;
  subheading: number;
  subheadingLineHeight: number;
  quote: number;
  quoteLineHeight: number;
  calloutTitle: number;
  calloutTitleLineHeight: number;
  calloutBody: number;
  calloutBodyLineHeight: number;
  meta: number;
  metaLineHeight: number;
  kicker: number;
  kickerLineHeight: number;
  code: number;
  codeLineHeight: number;
  cardPadding: number;
  surfaceGap: number;
  continuedPill: number;
};

const MINOR_SECOND = 1.067;
const DEFAULT_STAGE_LINE_HEIGHT = 1.6;

const roundStageValue = (value: number): number => Number(value.toFixed(1));
const minorSecond = (base: number, steps = 0): number => roundStageValue(base * MINOR_SECOND ** steps);
const lineHeight = (fontSize: number): number => roundStageValue(fontSize * DEFAULT_STAGE_LINE_HEIGHT);

const createStageScale = (base: number): StageTypographyScale => {
  const body = base;
  const list = body;
  const calloutTitle = minorSecond(base, 2);
  const subheading = minorSecond(base, 4);
  const quote = minorSecond(base, 3);
  const sectionTitle = minorSecond(base, 9);
  const leadTitle = minorSecond(base, 14);
  const meta = Math.max(14, roundStageValue(base * 0.45));
  const kicker = Math.max(18, roundStageValue(base * 0.56));
  const code = Math.max(24, roundStageValue(base * 0.82));

  return {
    leadTitle,
    leadTitleLineHeight: lineHeight(leadTitle),
    sectionTitle,
    sectionTitleLineHeight: lineHeight(sectionTitle),
    body,
    bodyLineHeight: lineHeight(body),
    list,
    listLineHeight: lineHeight(list),
    subheading,
    subheadingLineHeight: lineHeight(subheading),
    quote,
    quoteLineHeight: lineHeight(quote),
    calloutTitle,
    calloutTitleLineHeight: lineHeight(calloutTitle),
    calloutBody: body,
    calloutBodyLineHeight: lineHeight(body),
    meta,
    metaLineHeight: lineHeight(meta),
    kicker,
    kickerLineHeight: lineHeight(kicker),
    code,
    codeLineHeight: lineHeight(code),
    cardPadding: roundStageValue(base * 1.1),
    surfaceGap: roundStageValue(base * 0.8),
    continuedPill: Math.max(13, roundStageValue(meta * 0.92)),
  };
};

export const STAGE_TYPOGRAPHY_SCALES: Record<StageScalePreset, StageTypographyScale> = {
  compact: createStageScale(30),
  standard: createStageScale(34),
  wide: createStageScale(40),
};

export const resolveStageScalePreset = ({width, height}: {width: number; height: number}): StageScalePreset => {
  if (width < 1360 || height < 760) {
    return 'compact';
  }

  if (width < 1840 || height < 900) {
    return 'standard';
  }

  return 'wide';
};

export const getStageTypographyScale = (preset: StageScalePreset): StageTypographyScale =>
  STAGE_TYPOGRAPHY_SCALES[preset];

export const stageCharsToPixels = (fontSize: number, chars: number): number =>
  roundStageValue(fontSize * chars * 0.58);
