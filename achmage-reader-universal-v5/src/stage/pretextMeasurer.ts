import {layout, prepare} from '@chenglou/pretext';

import type {NormalizedBlock, RichBlockContent} from '../core/content';
import {getStageTypographyScale, stageCharsToPixels, type StageScalePreset, type StageTypographyScale} from './scale';

export type StageTypographyConfig = {
  preset: StageScalePreset;
  scale: StageTypographyScale;
  bodyFont: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  listFontSize: number;
  listLineHeight: number;
  headingFontFamily: string;
  headingFontWeight: number;
  leadTitleFontSize: number;
  leadTitleLineHeight: number;
  sectionTitleFontSize: number;
  sectionTitleLineHeight: number;
  h1FontSize: number;
  h1LineHeight: number;
  h2FontSize: number;
  h2LineHeight: number;
  h3FontSize: number;
  h3LineHeight: number;
  quoteFontSize: number;
  quoteLineHeight: number;
  calloutTitleFontSize: number;
  calloutTitleLineHeight: number;
  calloutBodyFontSize: number;
  calloutBodyLineHeight: number;
  codeFontFamily: string;
  codeFontSize: number;
  codeLineHeight: number;
  contentWidth: number;
  leadTitleWidth: number;
  proseMeasureWidth: number;
  listMeasureWidth: number;
  subheadingMeasureWidth: number;
  quoteMeasureWidth: number;
  fullMeasureWidth: number;
};

const DEFAULT_FONT_FAMILY =
  "'Pretendard Variable', 'Pretendard', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const DEFAULT_CODE_FONT =
  "'IBM Plex Mono', 'SFMono-Regular', 'JetBrains Mono', 'Consolas', 'Liberation Mono', monospace";

const DEFAULT_STAGE_SCALE_PRESET: StageScalePreset = 'standard';

export const createStageTypographyConfig = ({
  preset = DEFAULT_STAGE_SCALE_PRESET,
  contentWidth = 1152,
}: {
  preset?: StageScalePreset;
  contentWidth?: number;
} = {}): StageTypographyConfig => {
  const scale = getStageTypographyScale(preset);

  return {
    preset,
    scale,
    bodyFont: `500 ${scale.body}px ${DEFAULT_FONT_FAMILY}`,
    bodyFontSize: scale.body,
    bodyLineHeight: scale.bodyLineHeight,
    listFontSize: scale.list,
    listLineHeight: scale.listLineHeight,
    headingFontFamily: DEFAULT_FONT_FAMILY,
    headingFontWeight: 760,
    leadTitleFontSize: scale.leadTitle,
    leadTitleLineHeight: scale.leadTitleLineHeight,
    sectionTitleFontSize: scale.sectionTitle,
    sectionTitleLineHeight: scale.sectionTitleLineHeight,
    h1FontSize: scale.sectionTitle,
    h1LineHeight: scale.sectionTitleLineHeight,
    h2FontSize: Math.round(scale.sectionTitle / 1.067),
    h2LineHeight: Math.round(scale.sectionTitleLineHeight / 1.067),
    h3FontSize: scale.subheading,
    h3LineHeight: scale.subheadingLineHeight,
    quoteFontSize: scale.quote,
    quoteLineHeight: scale.quoteLineHeight,
    calloutTitleFontSize: scale.calloutTitle,
    calloutTitleLineHeight: scale.calloutTitleLineHeight,
    calloutBodyFontSize: scale.calloutBody,
    calloutBodyLineHeight: scale.calloutBodyLineHeight,
    codeFontFamily: DEFAULT_CODE_FONT,
    codeFontSize: scale.code,
    codeLineHeight: scale.codeLineHeight,
    contentWidth,
    leadTitleWidth: Math.min(contentWidth, Math.max(stageCharsToPixels(scale.leadTitle, 18), Math.round(contentWidth * 0.72))),
    proseMeasureWidth: Math.min(contentWidth, Math.max(stageCharsToPixels(scale.body, 82), Math.round(contentWidth * 0.88))),
    listMeasureWidth: Math.min(contentWidth, Math.max(stageCharsToPixels(scale.list, 88), Math.round(contentWidth * 0.94))),
    subheadingMeasureWidth: Math.min(contentWidth, Math.max(stageCharsToPixels(scale.subheading, 40), Math.round(contentWidth * 0.9))),
    quoteMeasureWidth: contentWidth,
    fullMeasureWidth: contentWidth,
  };
};

export const DEFAULT_STAGE_TYPOGRAPHY = createStageTypographyConfig();

const PREPARED_CACHE = new Map<string, ReturnType<typeof prepare>>();

const getPrepared = (text: string, font: string): ReturnType<typeof prepare> => {
  const key = `${font}::${text}`;
  const cached = PREPARED_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const next = prepare(text, font);
  PREPARED_CACHE.set(key, next);
  return next;
};

export const stripHtml = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|blockquote|h[1-6]|div)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();

const decodeHtmlAttribute = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .trim();

const richText = (rich?: RichBlockContent, html?: string): string => rich?.plainText ?? stripHtml(html ?? '');

export const measureStageTextHeight = ({
  text,
  font,
  width,
  lineHeight,
}: {
  text: string;
  font: string;
  width: number;
  lineHeight: number;
}): number => {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }

  try {
    return layout(getPrepared(normalized, font), Math.max(width, 1), lineHeight).height;
  } catch {
    const fontSizeMatch = font.match(/(\d+(?:\.\d+)?)px/);
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 24;
    const averageCharWidth = Math.max(fontSize * 0.5, 1);
    const charsPerLine = Math.max(Math.floor(width / averageCharWidth), 1);
    return Math.ceil(normalized.length / charsPerLine) * lineHeight;
  }
};

const proseFragmentPattern = /<(p|ul|ol|pre|table|blockquote|h[1-6]|figure|div)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

const isHeadingFragment = (html: string, level: 1 | 2 | 3): boolean => new RegExp(`^<h${level}\\b`, 'i').test(html.trim());
export const isStageHeadingProseBlock = (block: NormalizedBlock): boolean =>
  block.kind === 'prose' && /^<h[1-6]\b/i.test(block.html.trim());
const imageSrcPattern = /<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/i;
const imageAltPattern = /<img\b[^>]*\balt=(['"])(.*?)\1[^>]*>/i;
const figureCaptionPattern = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i;
const isListFragment = (html: string): boolean => /^<(ul|ol)\b/i.test(html.trim());
const isBlockquoteFragment = (html: string): boolean => /^<blockquote\b/i.test(html.trim());
const isCodeFragment = (html: string): boolean => /^<pre\b/i.test(html.trim());
const isTableFragment = (html: string): boolean => /^<table\b/i.test(html.trim());

const extractStageImageFromHtml = (html: string): Extract<NormalizedBlock, {kind: 'image'}> | null => {
  const trimmed = html.trim();
  if (!/<img\b/i.test(trimmed)) {
    return null;
  }

  const srcMatch = trimmed.match(imageSrcPattern);
  if (!srcMatch?.[2]) {
    return null;
  }

  const altMatch = trimmed.match(imageAltPattern);
  const figcaptionMatch = trimmed.match(figureCaptionPattern);
  const normalized = trimmed
    .replace(figureCaptionPattern, '')
    .replace(/<\/?(figure|p|div)\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  if (normalized.length > 0) {
    return null;
  }

  const caption = figcaptionMatch?.[1] ? stripHtml(figcaptionMatch[1]) : undefined;
  const alt = altMatch?.[2] ? decodeHtmlAttribute(altMatch[2]) : undefined;

  return {
    kind: 'image',
    src: decodeHtmlAttribute(srcMatch[2]),
    alt,
    caption: caption || alt,
  };
};

const coerceStageProseFragment = (block: Extract<NormalizedBlock, {kind: 'prose'}>): NormalizedBlock => {
  return extractStageImageFromHtml(block.html) ?? block;
};

export const splitProseBlock = (block: Extract<NormalizedBlock, {kind: 'prose'}>): NormalizedBlock[] => {
  const fragments = block.html.match(proseFragmentPattern);
  if (!fragments || fragments.length <= 1) {
    return [coerceStageProseFragment(block)];
  }

  return fragments.map((html) => ({
    ...coerceStageProseFragment({
      kind: 'prose',
      html,
    }),
  }));
};

export const expandStageBlocks = (blocks: readonly NormalizedBlock[]): NormalizedBlock[] =>
  blocks.flatMap((block) => {
    if (block.kind === 'prose') {
      return splitProseBlock(block);
    }

    return [block];
  });

const measureGridCardHeight = ({
  title,
  body,
  width,
  typo,
  scale = 1,
}: {
  title: string;
  body: string;
  width: number;
  typo: StageTypographyConfig;
  scale?: number;
}): number =>
  58 * scale +
  measureStageTextHeight({
    text: title,
    font: `${typo.headingFontWeight} ${typo.calloutTitleFontSize * scale}px ${typo.headingFontFamily}`,
    width,
    lineHeight: typo.calloutTitleLineHeight * scale,
  }) +
  measureStageTextHeight({
    text: body,
    font: `${500} ${typo.calloutBodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
    width,
    lineHeight: typo.calloutBodyLineHeight * scale,
  });

const SCALEABLE_SOLO_BLOCK_KINDS = new Set<NormalizedBlock['kind']>([
  'thesis',
  'callout',
  'docQuote',
  'evidencePanel',
  'log',
  'provenance',
]);

const isScaleableSoloBlock = (block: NormalizedBlock): boolean => {
  if (SCALEABLE_SOLO_BLOCK_KINDS.has(block.kind)) {
    return true;
  }

  if (block.kind === 'questionReset') {
    return block.items.length === 1;
  }

  if (block.kind === 'evidenceGrid') {
    return block.items.length === 1;
  }

  return false;
};

export const measureStageBlockHeight = ({
  block,
  typo,
  frameHeight,
  frameWidth: _frameWidth,
  focusScale = 1,
}: {
  block: NormalizedBlock;
  typo: StageTypographyConfig;
  frameHeight: number;
  frameWidth: number;
  focusScale?: number;
}): number => {
  const scale = focusScale > 1 && isScaleableSoloBlock(block) ? focusScale : 1;

  switch (block.kind) {
    case 'thesis':
      return (
        typo.scale.cardPadding * 2.2 * scale +
        measureStageTextHeight({
          text: richText(block.rich, block.content),
          font: `${typo.headingFontWeight} ${typo.calloutBodyFontSize * scale}px ${typo.headingFontFamily}`,
          width: typo.fullMeasureWidth,
          lineHeight: typo.calloutBodyLineHeight * scale,
        })
      );
    case 'callout':
      return (
        typo.scale.cardPadding * 2.8 * scale +
        measureStageTextHeight({
          text: block.title,
          font: `${typo.headingFontWeight} ${typo.calloutTitleFontSize * scale}px ${typo.headingFontFamily}`,
          width: Math.max(typo.fullMeasureWidth - typo.scale.cardPadding * 2 * scale, 220),
          lineHeight: typo.calloutTitleLineHeight * scale,
        }) +
        measureStageTextHeight({
          text: stripHtml(block.content),
          font: `${500} ${typo.calloutBodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
          width: Math.max(typo.fullMeasureWidth - typo.scale.cardPadding * 2 * scale, 220),
          lineHeight: typo.calloutBodyLineHeight * scale,
        })
      );
    case 'docQuote':
      return (
        typo.scale.cardPadding * 2.4 * scale +
        measureStageTextHeight({
          text: richText(block.rich, block.content),
          font: `500 ${typo.quoteFontSize * scale}px ${typo.headingFontFamily}`,
          width: Math.max(typo.quoteMeasureWidth - typo.scale.cardPadding * 2 * scale, 240),
          lineHeight: typo.quoteLineHeight * scale,
        })
      );
    case 'prose': {
      const html = block.html.trim();
      if (isHeadingFragment(html, 1)) {
        return (
          typo.scale.surfaceGap +
          measureStageTextHeight({
            text: stripHtml(html),
            font: `${typo.headingFontWeight} ${typo.h1FontSize}px ${typo.headingFontFamily}`,
            width: typo.subheadingMeasureWidth,
            lineHeight: typo.h1LineHeight,
          })
        );
      }

      if (isHeadingFragment(html, 2)) {
        return (
          typo.scale.surfaceGap +
          measureStageTextHeight({
            text: stripHtml(html),
            font: `${typo.headingFontWeight} ${typo.h2FontSize}px ${typo.headingFontFamily}`,
            width: typo.subheadingMeasureWidth,
            lineHeight: typo.h2LineHeight,
          })
        );
      }

      if (isHeadingFragment(html, 3)) {
        return (
          typo.scale.surfaceGap +
          measureStageTextHeight({
            text: stripHtml(html),
            font: `${typo.headingFontWeight} ${typo.h3FontSize}px ${typo.headingFontFamily}`,
            width: typo.subheadingMeasureWidth,
            lineHeight: typo.h3LineHeight,
          })
        );
      }

      if (isListFragment(html)) {
        return (
          typo.scale.surfaceGap +
          measureStageTextHeight({
            text: stripHtml(html),
            font: `${500} ${typo.listFontSize}px ${DEFAULT_FONT_FAMILY}`,
            width: typo.listMeasureWidth,
            lineHeight: typo.listLineHeight,
          })
        );
      }

      if (isBlockquoteFragment(html)) {
        return (
          typo.scale.cardPadding * 1.6 +
          measureStageTextHeight({
            text: stripHtml(html),
            font: `500 ${typo.quoteFontSize}px ${typo.headingFontFamily}`,
            width: typo.proseMeasureWidth,
            lineHeight: typo.quoteLineHeight,
          })
        );
      }

      if (isCodeFragment(html)) {
        const lineCount = Math.max(stripHtml(html).split(/\r?\n/).length, 1);
        return typo.scale.cardPadding * 1.8 + lineCount * typo.codeLineHeight;
      }

      if (isTableFragment(html)) {
        const rowCount = Math.max((html.match(/<tr\b/gi) ?? []).length, 1);
        const cellCount = Math.max((html.match(/<(td|th)\b/gi) ?? []).length, 1);
        const cellDensity = stripHtml(html).length / cellCount;
        const columnCount = Math.max((html.match(/<(td|th)\b/gi) ?? []).length / rowCount, 1);
        const tableFontSize = Math.round(typo.bodyFontSize * 0.78);
        const baseRowHeight = Math.round(tableFontSize * 1.65) + 18;
        const densityExtra = cellDensity > 90 ? 34 : cellDensity > 55 ? 20 : cellDensity > 30 ? 10 : 0;
        const columnExtra = columnCount > 3 ? 10 : 0;
        return typo.scale.cardPadding + 62 + rowCount * (baseRowHeight + densityExtra + columnExtra);
      }

      return (
        typo.scale.surfaceGap +
        measureStageTextHeight({
          text: stripHtml(html),
          font: typo.bodyFont,
          width: typo.proseMeasureWidth,
          lineHeight: typo.bodyLineHeight,
        })
      );
    }
    case 'questionReset':
      return (
        typo.scale.cardPadding * 2.2 * scale +
        block.items.reduce((sum, item) => {
          return (
            sum +
            measureStageTextHeight({
              text: item.title,
              font: `${typo.headingFontWeight} ${typo.calloutTitleFontSize * scale}px ${typo.headingFontFamily}`,
              width: typo.fullMeasureWidth,
              lineHeight: typo.calloutTitleLineHeight * scale,
            }) +
            measureStageTextHeight({
              text: stripHtml(item.body),
              font: `${500} ${typo.calloutBodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
              width: typo.fullMeasureWidth,
              lineHeight: typo.calloutBodyLineHeight * scale,
            }) +
            typo.scale.surfaceGap * scale
          );
        }, 0)
      );
    case 'evidenceGrid': {
      const columns = Math.max(1, Math.min(block.items.length >= 3 ? 3 : block.items.length >= 2 ? 2 : 1, 3));
      const cardWidth = (typo.fullMeasureWidth - (columns - 1) * typo.scale.surfaceGap) / columns;
      const cardHeights = block.items.map((item) =>
        measureGridCardHeight({
          title: item.title,
          body: stripHtml(item.body),
          width: cardWidth,
          typo,
          scale,
        }),
      );
      const rows = Math.ceil(cardHeights.length / columns);
      const rowHeights = Array.from({length: rows}, (_, rowIndex) =>
        Math.max(...cardHeights.slice(rowIndex * columns, rowIndex * columns + columns)),
      );
      return (
        typo.scale.cardPadding * 1.4 * scale +
        rowHeights.reduce((sum, height) => sum + height, 0) +
        Math.max(rows - 1, 0) * typo.scale.surfaceGap * scale
      );
    }
    case 'evidencePanel':
      return (
        typo.scale.cardPadding * 2 * scale +
        measureStageTextHeight({
          text: block.item.title,
          font: `${typo.headingFontWeight} ${typo.calloutTitleFontSize * scale}px ${typo.headingFontFamily}`,
          width: typo.fullMeasureWidth,
          lineHeight: typo.calloutTitleLineHeight * scale,
        }) +
        measureStageTextHeight({
          text: stripHtml(block.item.body),
          font: `${500} ${typo.calloutBodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
          width: typo.fullMeasureWidth,
          lineHeight: typo.calloutBodyLineHeight * scale,
        })
      );
    case 'axisTable': {
      const rowCount = Math.max(block.rows.length + 1, 1);
      const columnCount = Math.max(block.headers.length, 1);
      const cellDensity = block.rows.flat().join(' ').length / Math.max(block.rows.length * columnCount, 1);
      const tableFontSize = Math.round(typo.bodyFontSize * 0.78);
      const baseRowHeight = Math.round(tableFontSize * 1.65) + 18;
      const densityExtra = cellDensity > 90 ? 34 : cellDensity > 55 ? 20 : cellDensity > 30 ? 10 : 0;
      const columnExtra = columnCount > 3 ? 10 : 0;
      return typo.scale.cardPadding + 62 + rowCount * (baseRowHeight + densityExtra + columnExtra);
    }
    case 'log': {
      const lineCount = block.code.split(/\r?\n/).length;
      return typo.scale.cardPadding * 2 * scale + lineCount * typo.codeLineHeight * scale;
    }
    case 'provenance':
      return typo.scale.cardPadding * 3.4 * scale + Math.max(block.ai.basedOn.length - 1, 0) * typo.scale.surfaceGap * scale;
    case 'image':
      return Math.max(frameHeight * 0.64, 360);
  }
};
