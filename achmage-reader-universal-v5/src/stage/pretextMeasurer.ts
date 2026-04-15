import {layout, prepare} from '@chenglou/pretext';

import type {NormalizedBlock, RichBlockContent} from '../core/content';

export type StageTypographyConfig = {
  bodyFont: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  headingFontFamily: string;
  headingFontWeight: number;
  h1FontSize: number;
  h2FontSize: number;
  h3FontSize: number;
  codeFontFamily: string;
  codeFontSize: number;
  codeLineHeight: number;
  contentWidth: number;
};

const DEFAULT_FONT_FAMILY =
  "'Pretendard Variable', 'Pretendard', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const DEFAULT_CODE_FONT =
  "'IBM Plex Mono', 'SFMono-Regular', 'JetBrains Mono', 'Consolas', 'Liberation Mono', monospace";

export const DEFAULT_STAGE_TYPOGRAPHY: StageTypographyConfig = {
  bodyFont: `500 24px ${DEFAULT_FONT_FAMILY}`,
  bodyFontSize: 24,
  bodyLineHeight: 38,
  headingFontFamily: DEFAULT_FONT_FAMILY,
  headingFontWeight: 760,
  h1FontSize: 54,
  h2FontSize: 38,
  h3FontSize: 30,
  codeFontFamily: DEFAULT_CODE_FONT,
  codeFontSize: 22,
  codeLineHeight: 32,
  contentWidth: 1000,
};

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

const richText = (rich?: RichBlockContent, html?: string): string => rich?.plainText ?? stripHtml(html ?? '');

const measureTextHeight = ({
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

export const splitProseBlock = (block: Extract<NormalizedBlock, {kind: 'prose'}>): NormalizedBlock[] => {
  const fragments = block.html.match(proseFragmentPattern);
  if (!fragments || fragments.length <= 1) {
    return [block];
  }

  return fragments.map((html) => ({
    kind: 'prose',
    html,
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
  44 * scale +
  measureTextHeight({
    text: title,
    font: `${typo.headingFontWeight} ${23 * scale}px ${typo.headingFontFamily}`,
    width,
    lineHeight: 28 * scale,
  }) +
  measureTextHeight({
    text: body,
    font: `${500} ${typo.bodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
    width,
    lineHeight: 34 * scale,
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
  frameWidth,
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
        54 * scale +
        measureTextHeight({
          text: richText(block.rich, block.content),
          font: `${typo.headingFontWeight} ${31 * scale}px ${typo.headingFontFamily}`,
          width: frameWidth,
          lineHeight: 44 * scale,
        })
      );
    case 'callout':
      return (
        82 * scale +
        measureTextHeight({
          text: block.title,
          font: `${typo.headingFontWeight} ${25 * scale}px ${typo.headingFontFamily}`,
          width: frameWidth - 16,
          lineHeight: 30 * scale,
        }) +
        measureTextHeight({
          text: stripHtml(block.content),
          font: `${500} ${typo.bodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
          width: frameWidth - 16,
          lineHeight: 38 * scale,
        })
      );
    case 'docQuote':
      return (
        58 * scale +
        measureTextHeight({
          text: richText(block.rich, block.content),
          font: `500 ${27 * scale}px ${typo.headingFontFamily}`,
          width: frameWidth - 40,
          lineHeight: 40 * scale,
        })
      );
    case 'prose':
      return (
        18 +
        measureTextHeight({
          text: stripHtml(block.html),
          font: typo.bodyFont,
          width: frameWidth,
          lineHeight: typo.bodyLineHeight,
        })
      );
    case 'questionReset':
      return (
        48 * scale +
        block.items.reduce((sum, item) => {
          return (
            sum +
            measureTextHeight({
              text: item.title,
              font: `${typo.headingFontWeight} ${24 * scale}px ${typo.headingFontFamily}`,
              width: frameWidth,
              lineHeight: 30 * scale,
            }) +
            measureTextHeight({
              text: stripHtml(item.body),
              font: `${500} ${typo.bodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
              width: frameWidth,
              lineHeight: 34 * scale,
            }) +
            20 * scale
          );
        }, 0)
      );
    case 'evidenceGrid': {
      const columns = Math.max(1, Math.min(block.items.length >= 3 ? 3 : block.items.length >= 2 ? 2 : 1, 3));
      const cardWidth = (frameWidth - (columns - 1) * 18) / columns;
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
      return 28 * scale + rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(rows - 1, 0) * 18 * scale;
    }
    case 'evidencePanel':
      return (
        42 * scale +
        measureTextHeight({
          text: block.item.title,
          font: `${typo.headingFontWeight} ${24 * scale}px ${typo.headingFontFamily}`,
          width: frameWidth,
          lineHeight: 30 * scale,
        }) +
        measureTextHeight({
          text: stripHtml(block.item.body),
          font: `${500} ${typo.bodyFontSize * scale}px ${DEFAULT_FONT_FAMILY}`,
          width: frameWidth,
          lineHeight: 34 * scale,
        })
      );
    case 'axisTable': {
      const rowCount = Math.max(block.rows.length + 1, 1);
      const columnCount = Math.max(block.headers.length, 1);
      const cellDensity = block.rows.flat().join(' ').length / Math.max(block.rows.length * columnCount, 1);
      const rowHeight = cellDensity > 70 ? 68 : cellDensity > 40 ? 56 : 46;
      return 54 + rowCount * rowHeight;
    }
    case 'log': {
      const lineCount = block.code.split(/\r?\n/).length;
      return 56 * scale + lineCount * typo.codeLineHeight * scale;
    }
    case 'provenance':
      return 150 * scale + Math.max(block.ai.basedOn.length - 1, 0) * 18 * scale;
    case 'image':
      return Math.max(frameHeight * 0.52, 320);
  }
};
