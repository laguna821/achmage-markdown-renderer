import {pretextConfig, type PretextConfig} from '../../config/pretext';
import type {DocFrontmatter, OutputMode} from '../content';

import type {LayoutHint, SupportedPretextBlockKind} from './types';

const cloneHint = (hint: LayoutHint): LayoutHint => ({...hint});
type PretextMetaContext = Pick<DocFrontmatter, 'pretext' | 'docType'>;

const getDocPretext = (meta?: Partial<PretextMetaContext>): DocFrontmatter['pretext'] | undefined => meta?.pretext;
const clampPreferredLines = (value: number, minLines: number, maxLines: number): number =>
  Math.max(minLines, Math.min(maxLines, value));
const isConfigLike = (
  value: Partial<PretextMetaContext> | PretextConfig | undefined,
): value is PretextConfig =>
  Boolean(value) && typeof value === 'object' && 'enabled' in value && 'outputs' in value;
const resolveMetaAndConfig = (
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): {meta: Partial<PretextMetaContext> | undefined; config: PretextConfig} =>
  isConfigLike(metaOrConfig) ? {meta: undefined, config: metaOrConfig} : {meta: metaOrConfig, config};

const isReaderNoteDoc = (output: OutputMode, meta?: Partial<PretextMetaContext>): boolean =>
  output === 'reader' && meta?.docType === 'note';

export const isPretextEnabledForOutput = (
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): boolean => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  return resolved.config.enabled && resolved.config.outputs[output] && !getDocPretext(resolved.meta)?.disabled;
};

export const resolveHeaderLayoutHints = (
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): LayoutHint[] => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  const meta = resolved.meta;
  const appliedConfig = resolved.config;

  if (!isPretextEnabledForOutput(output, meta, appliedConfig) || !appliedConfig.targets.header) {
    return [];
  }

  const docPretext = getDocPretext(meta);
  const minLines = 2;
  const maxLines = output === 'newsletter' && appliedConfig.phase >= 2 ? 4 : 3;
  const fallbackPreferred = output === 'newsletter' && appliedConfig.phase >= 2 ? 3 : 2;
  const preferredLines = clampPreferredLines(docPretext?.heroPreferredLines ?? fallbackPreferred, minLines, maxLines);

  return [
    cloneHint({
      kind: 'balance-title',
      target: 'header',
      minLines,
      maxLines,
      preferredLines,
      priority: 100,
    }),
  ];
};

export const resolveBlockLayoutHints = (
  blockKind: SupportedPretextBlockKind,
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): LayoutHint[] => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  const meta = resolved.meta;
  const appliedConfig = resolved.config;

  if (!isPretextEnabledForOutput(output, meta, appliedConfig)) {
    return [];
  }

  const docPretext = getDocPretext(meta);
  const readerNoteDoc = isReaderNoteDoc(output, meta);

  if (blockKind === 'thesis' && appliedConfig.targets.thesis) {
    if (readerNoteDoc) {
      return [];
    }

    const minLines = output === 'newsletter' && appliedConfig.phase >= 2 ? 2 : 3;
    const maxLines = docPretext?.thesisMaxLines ?? (output === 'newsletter' && appliedConfig.phase >= 2 ? 4 : 5);
    const preferredLines = clampPreferredLines(
      output === 'newsletter' && appliedConfig.phase >= 2 ? 3 : 4,
      minLines,
      maxLines,
    );

    return [
      cloneHint({
        kind: 'balance-title',
        target: 'thesis',
        minLines,
        maxLines,
        preferredLines,
        priority: 80,
      }),
      cloneHint({
        kind: 'shrink-wrap',
        target: 'thesis',
        minLines,
        maxLines,
        preferredLines,
        priority: 90,
      }),
    ];
  }

  if (blockKind === 'docQuote' && appliedConfig.targets.quote) {
    if (readerNoteDoc) {
      return [];
    }

    const minLines = 2;
    const maxLines = output === 'newsletter' && appliedConfig.phase >= 2 ? 4 : 5;
    const preferredLines = output === 'newsletter' && appliedConfig.phase >= 2 ? 2 : 3;

    return [
      cloneHint({
        kind: 'shrink-wrap',
        target: 'quote',
        minLines,
        maxLines,
        preferredLines,
        priority: 70,
      }),
    ];
  }

  if (blockKind === 'evidenceGrid' && appliedConfig.targets.evidenceGrid) {
    const minColumns = docPretext?.evidenceMinColumns ?? (output === 'newsletter' && appliedConfig.phase >= 2 ? 2 : 1);

    return [
      cloneHint({
        kind: 'measure-card',
        target: 'card-title',
        minColumns,
        maxColumns: 3,
        priority: 75,
      }),
    ];
  }

  if (blockKind === 'questionReset') {
    return [
      cloneHint({
        kind: 'balance-title',
        target: 'prose',
        minLines: 1,
        maxLines: 2,
        preferredLines: 1,
        priority: 50,
      }),
    ];
  }

  return [];
};

export const resolveSectionLayoutHints = (
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): LayoutHint[] => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  const meta = resolved.meta;
  const appliedConfig = resolved.config;

  if (
    !isPretextEnabledForOutput(output, meta, appliedConfig) ||
    !appliedConfig.targets.sectionCover ||
    appliedConfig.phase < 2 ||
    output !== 'stage'
  ) {
    return [];
  }

  const docPretext = getDocPretext(meta);
  const preferredLines = clampPreferredLines(docPretext?.heroPreferredLines ?? 2, 1, 3);

  return [
    cloneHint({
      kind: 'balance-title',
      target: 'section-cover',
      minLines: 1,
      maxLines: 3,
      preferredLines,
      priority: 88,
    }),
    cloneHint({
      kind: 'fit-screen',
      target: 'section-cover',
      maxViewportRatio: 0.82,
      priority: 96,
    }),
  ];
};

export const resolveAxisTableLayoutHints = (
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): LayoutHint[] => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  const meta = resolved.meta;
  const appliedConfig = resolved.config;

  if (!isPretextEnabledForOutput(output, meta, appliedConfig) || !appliedConfig.targets.axisTable || appliedConfig.phase < 2) {
    return [];
  }

  return [
    cloneHint({
      kind: 'fit-screen',
      target: 'prose',
      priority: 68,
    }),
  ];
};

export const resolveWrapFigureLayoutHints = (
  output: OutputMode,
  metaOrConfig?: Partial<PretextMetaContext> | PretextConfig,
  config: PretextConfig = pretextConfig,
): LayoutHint[] => {
  const resolved = resolveMetaAndConfig(metaOrConfig, config);
  const meta = resolved.meta;
  const appliedConfig = resolved.config;

  if (
    !isPretextEnabledForOutput(output, meta, appliedConfig) ||
    !appliedConfig.targets.wrapFigure ||
    appliedConfig.phase < 2 ||
    output !== 'newsletter' ||
    !getDocPretext(meta)?.forceWrapFigure
  ) {
    return [];
  }

  return [
    cloneHint({
      kind: 'wrap-around-figure',
      target: 'prose',
      priority: 66,
    }),
  ];
};

export const getHintByKind = (hints: LayoutHint[], kind: LayoutHint['kind']): LayoutHint | undefined =>
  hints.find((hint) => hint.kind === kind);

export const buildPretextTargetAttributes = ({
  slug,
  hint,
  keySuffix,
  extras,
}: {
  slug: string;
  hint: LayoutHint;
  keySuffix: string;
  extras?: Record<string, string | number | undefined>;
}): Record<string, string> => {
  const attributes: Record<string, string> = {
    'data-pretext': hint.kind,
    'data-pretext-key': `doc:${slug}:${keySuffix}`,
  };

  if (hint.target) {
    attributes['data-pretext-target'] = hint.target;
  }

  if (hint.minLines !== undefined) {
    attributes['data-pretext-min-lines'] = String(hint.minLines);
  }

  if (hint.maxLines !== undefined) {
    attributes['data-pretext-max-lines'] = String(hint.maxLines);
  }

  if (hint.preferredLines !== undefined) {
    attributes['data-pretext-preferred-lines'] = String(hint.preferredLines);
  }

  if (hint.minColumns !== undefined) {
    attributes['data-pretext-min-columns'] = String(hint.minColumns);
  }

  if (hint.maxColumns !== undefined) {
    attributes['data-pretext-max-columns'] = String(hint.maxColumns);
  }

  if (hint.maxViewportRatio !== undefined) {
    attributes['data-pretext-max-viewport-ratio'] = String(hint.maxViewportRatio);
  }

  for (const [key, value] of Object.entries(extras ?? {})) {
    if (value !== undefined) {
      attributes[key] = String(value);
    }
  }

  return attributes;
};
