import type {NormalizedBlock, NormalizedDoc} from '../content';

export type StageMode = 'reader' | 'stage' | 'newsletter';

export type DocumentModeLink = {
  label: 'Reader' | 'Stage' | 'Newsletter';
  href: string;
  active: boolean;
};

export type StageDeckOptions = {
  frameHeight?: number;
  frameWidth?: number;
  blockGap?: number;
};

export type StageFrame = {
  id: string;
  title: string;
  continued: boolean;
  includeDocumentHeader: boolean;
  blocks: NormalizedBlock[];
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
