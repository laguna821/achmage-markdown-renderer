export type LayoutHintKind =
  | 'balance-title'
  | 'shrink-wrap'
  | 'fit-screen'
  | 'measure-card'
  | 'wrap-around-figure'
  | 'manual-lines';

export type LayoutHintTarget = 'header' | 'thesis' | 'quote' | 'card-title' | 'section-cover' | 'prose';

export type LayoutHint = {
  kind: LayoutHintKind;
  target?: LayoutHintTarget;
  minLines?: number;
  maxLines?: number;
  preferredLines?: number;
  minColumns?: 1 | 2 | 3;
  maxColumns?: 1 | 2 | 3;
  maxViewportRatio?: number;
  priority?: number;
};

export type PretextQaLevel = 'info' | 'warn' | 'error';

export type PretextQaCode =
  | 'TITLE_TOO_LONG'
  | 'TITLE_TOO_SHORT_FOR_BALANCE'
  | 'THESIS_OVERFLOW'
  | 'STAGE_HERO_OVERFLOW'
  | 'CARD_HEIGHT_IMBALANCE'
  | 'QUOTE_TOO_WIDE'
  | 'AXIS_TABLE_MOBILE_RISK'
  | 'NEWSLETTER_COVER_IMBALANCE'
  | 'SECTION_COVER_OVERFLOW';

export type PretextQaFinding = {
  level: PretextQaLevel;
  code: PretextQaCode;
  message: string;
  slug: string;
  sectionId?: string;
  blockIndex?: number;
  meta?: Record<string, unknown>;
};

export type BalancedWidthCandidate = {
  width: number;
  lineCount: number;
  widestLineWidth: number;
  raggedness: number;
};

export type EvidenceColumnCandidate = {
  columns: 1 | 2 | 3;
  heights: number[];
};

export type StageFitState = 'stage-fit-ok' | 'stage-fit-tight' | 'stage-fit-overflow';
export type AxisTableRiskState = 'low' | 'high';
export type WrapFigureMode = 'wrap' | 'stacked';

export type SupportedPretextBlockKind = 'thesis' | 'docQuote' | 'evidenceGrid' | 'questionReset';
