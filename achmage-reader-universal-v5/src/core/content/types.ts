export type OutputMode = 'reader' | 'stage' | 'newsletter';
export type DocType = 'lecture' | 'newsletter' | 'note' | 'handout';
export type ThemeMode = 'light' | 'dark' | 'aurora' | 'cyber_sanctuary' | 'auto';
export type TocDepthOption = 'auto' | 1 | 2 | 3;
export type SourceConfidence = 'low' | 'medium' | 'high';

export type VaultFileSnapshot = {
  filePath: string;
  relativePath: string;
  size: number;
  mtimeMs: number;
  content: string;
};

export type VaultScanFile = Omit<VaultFileSnapshot, 'content'>;

export type VaultState = {
  rootPath: string;
  docCount: number;
  lastIndexedAt?: string;
  watchStatus: string;
  signature: string;
};

export type VaultSnapshot = {
  state: VaultState;
  files: VaultFileSnapshot[];
};

export type VaultScan = {
  state: VaultState;
  files: VaultScanFile[];
};

export type VaultBatchFile = {
  relativePath: string;
  content: string;
};

export type VaultFileBatch = {
  files: VaultBatchFile[];
};

export type VaultValidationStage = 'frontmatter' | 'slug' | 'markdown' | 'snapshot';

export type VaultValidationError = {
  relativePath: string;
  stage: VaultValidationStage;
  message: string;
};

export type VaultLoadPhase = 'idle' | 'scanning' | 'validating' | 'ready' | 'blocked' | 'failed';

export type VaultLoadState = {
  phase: VaultLoadPhase;
  vaultPath: string | null;
  totalFiles: number;
  validatedFiles: number;
  currentRelativePath?: string;
  fatalCount: number;
  firstFatalErrors: VaultValidationError[];
  error: string | null;
  signature: string | null;
};

export type VaultLoadReport = VaultLoadState & {
  generatedAt: string;
  errors: VaultValidationError[];
};
export type PretextDocumentOverrides = {
  disabled?: boolean;
  heroPreferredLines?: 2 | 3 | 4 | 5;
  thesisMaxLines?: 3 | 4 | 5 | 6;
  evidenceMinColumns?: 1 | 2 | 3;
  forceWrapFigure?: boolean;
};

export type DocFrontmatter = {
  title: string;
  slug?: string;
  docType: DocType;
  outputs: OutputMode[];
  theme: ThemeMode;
  author?: string;
  date?: string;
  tags: string[];
  summary?: string;
  heroLabel?: string;
  toc: 'auto' | 'none';
  tocMaxDepth: TocDepthOption;
  tocTitle: string;
  stage: {
    enabled: boolean;
    focusMode: boolean;
    keyboardNav: boolean;
    revealLists: boolean;
  };
  ai?: {
    assisted: boolean;
    model?: string;
    generatedAt?: string;
    sourceConfidence?: SourceConfidence;
    basedOn: string[];
  };
  rail: {
    showMetadata: boolean;
    showTags: boolean;
    showToc: boolean;
  };
  pretext?: PretextDocumentOverrides;
};

export type SourceDocument = {
  filePath: string;
  relativePath: string;
  sourceRoot: string;
  sourceDir: string;
  body: string;
  rawFrontmatter: Record<string, unknown>;
  meta: DocFrontmatter;
  warnings: string[];
};

export type HeadingRecord = {
  id: string;
  text: string;
  depth: number;
  level: number;
  index: number;
};

export type HeadingCollection = {
  baseDepth: number | null;
  items: HeadingRecord[];
};

export type TocItem = {
  text: string;
  slug: string;
  depth: number;
  level: number;
  children?: TocItem[];
};

export type QuestionResetItem = {
  id?: string;
  title: string;
  body: string;
};

export type EvidenceItem = {
  id?: string;
  title: string;
  body: string;
  tag?: string;
};

export type InlineToken =
  | {kind: 'text'; value: string}
  | {kind: 'strong'; children: readonly InlineToken[]}
  | {kind: 'em'; children: readonly InlineToken[]}
  | {kind: 'code'; value: string}
  | {kind: 'link'; href: string; children: readonly InlineToken[]}
  | {kind: 'badge'; value: string}
  | {kind: 'br'};

export type RichBlockContent = {
  plainText: string;
  tokens: readonly InlineToken[];
};

export type NormalizedBlock =
  | {kind: 'thesis'; content: string; rich?: RichBlockContent}
  | {kind: 'callout'; calloutType: string; title: string; content: string}
  | {kind: 'questionReset'; items: QuestionResetItem[]}
  | {kind: 'evidenceGrid'; items: EvidenceItem[]}
  | {kind: 'evidencePanel'; item: EvidenceItem}
  | {kind: 'axisTable'; headers: string[]; rows: string[][]}
  | {kind: 'docQuote'; content: string; rich?: RichBlockContent}
  | {kind: 'log'; language?: string; code: string}
  | {kind: 'provenance'; ai: NonNullable<DocFrontmatter['ai']>}
  | {kind: 'prose'; html: string}
  | {kind: 'image'; src: string; alt?: string; caption?: string};

export type NormalizedSection = {
  id: string;
  title: string;
  depth: number;
  anchorId?: string;
  blocks: NormalizedBlock[];
};

export type NormalizedDoc = {
  filePath: string;
  relativePath: string;
  sourceRoot: string;
  sourceDir: string;
  slug: string;
  meta: DocFrontmatter;
  baseDepth: number | null;
  headings: TocItem[];
  sections: NormalizedSection[];
  warnings: string[];
};

export type MdNode = {
  type: string;
  depth?: number;
  lang?: string | null;
  url?: string;
  alt?: string | null;
  value?: string;
  children?: MdNode[];
  align?: Array<'left' | 'right' | 'center' | null>;
  ordered?: boolean;
  data?: {
    hProperties?: Record<string, unknown>;
  };
};

export type MdRoot = {
  type: 'root';
  children: MdNode[];
};
