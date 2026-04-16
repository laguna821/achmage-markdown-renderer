import type {NormalizedBlock, NormalizedDoc, OutputMode} from '../core/content';
import type {StageScalePreset} from './scale';

export type StageMode = OutputMode;

export type DocumentModeLink = {
  label: 'Reader' | 'Stage' | 'Newsletter';
  output: OutputMode;
  href: string;
  active: boolean;
};

export type StageViewportBudget = {
  width: number;
  height: number;
  rightRailReserve: number;
  bottomControlsReserve: number;
  headingReserve: number;
  continuedHeadingReserve: number;
  blockGap?: number;
};

export type StageDeckOptions = Partial<StageViewportBudget>;

export type StageLayoutIntent = 'lead' | 'section-text' | 'media';

export type StageFrame = {
  id: string;
  title: string;
  continued: boolean;
  includeDocumentHeader: boolean;
  sectionId?: string;
  sectionTitle?: string;
  blocks: NormalizedBlock[];
  layoutIntent: StageLayoutIntent;
  availableHeight: number;
  occupancyRatio: number;
  scalePreset: StageScalePreset;
  focusScale?: number;
};

export type StageGroup = {
  id: string;
  title: string;
  kind: 'lead' | 'section';
  sectionId?: string;
  frames: StageFrame[];
};

export type StageDeck = {
  slug: string;
  title: string;
  keyboardNav: boolean;
  scalePreset: StageScalePreset;
  groups: StageGroup[];
};

export type StageDoc = Pick<NormalizedDoc, 'slug' | 'meta' | 'sections'>;
