import type {NormalizedBlock, NormalizedDoc, OutputMode} from '../core/content';

export type StageMode = OutputMode;

export type DocumentModeLink = {
  label: 'Reader' | 'Stage' | 'Newsletter';
  output: OutputMode;
  href: string;
  active: boolean;
};

export type StageDeckOptions = {
  frameHeight?: number;
  frameWidth?: number;
  blockGap?: number;
};

export type StageLayoutIntent = 'header-only' | 'image' | 'sparse' | 'default';

export type StageFrame = {
  id: string;
  title: string;
  continued: boolean;
  includeDocumentHeader: boolean;
  sectionId?: string;
  sectionTitle?: string;
  blocks: NormalizedBlock[];
  layoutIntent: StageLayoutIntent;
  occupancyRatio: number;
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
  groups: StageGroup[];
};

export type StageDoc = Pick<NormalizedDoc, 'slug' | 'meta' | 'sections'>;
