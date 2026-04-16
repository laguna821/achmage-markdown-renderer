import {layout, layoutNextLine, prepare, prepareWithSegments, walkLineRanges} from '@chenglou/pretext';

import {pretextConfig} from '../../config/pretext';
import type {OutputMode} from '../content';

import {
  chooseBalancedWidth,
  chooseEvidenceColumns,
  classifyAxisTableRisk,
  classifyStageHeroFit,
  decideWrapFigureMode,
} from './heuristics';
import {createQaFinding, dedupeQaFindings} from './qa';
import {buildRichTextLines, createRichLineElements, parseRichBlockContent} from './rich-text';
import type {BalancedWidthCandidate, PretextQaFinding} from './types';

declare global {
  interface Window {
    __ACHMAGE_PRETEXT_QA__?: PretextQaFinding[];
    __ACHMAGE_PRETEXT_INIT__?: Set<string>;
  }
}

const preparedCache = new Map<string, ReturnType<typeof prepare>>();
const preparedSegmentsCache = new Map<string, ReturnType<typeof prepareWithSegments>>();

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCanvasFont = (element: HTMLElement): string => {
  const style = window.getComputedStyle(element);
  const fontStyle = style.fontStyle === 'normal' ? '' : `${style.fontStyle} `;
  const fontWeight = style.fontWeight ? `${style.fontWeight} ` : '';
  const fontSize = style.fontSize || '16px';
  const fontFamily = style.fontFamily || 'sans-serif';
  return `${fontStyle}${fontWeight}${fontSize} ${fontFamily}`.trim();
};

const getLineHeightPx = (element: HTMLElement): number => {
  const style = window.getComputedStyle(element);
  const fontSize = Number.parseFloat(style.fontSize || '16') || 16;
  if (style.lineHeight === 'normal') {
    return fontSize * 1.3;
  }

  const numeric = Number.parseFloat(style.lineHeight);
  return Number.isFinite(numeric) ? numeric : fontSize * 1.3;
};

const getPrepared = (text: string, font: string): ReturnType<typeof prepare> => {
  const key = `${font}::${text}`;
  const cached = preparedCache.get(key);
  if (cached) {
    return cached;
  }

  const next = prepare(text, font);
  preparedCache.set(key, next);
  return next;
};

const getPreparedWithSegments = (text: string, font: string): ReturnType<typeof prepareWithSegments> => {
  const key = `${font}::${text}`;
  const cached = preparedSegmentsCache.get(key);
  if (cached) {
    return cached;
  }

  const next = prepareWithSegments(text, font);
  preparedSegmentsCache.set(key, next);
  return next;
};

const getAvailableWidth = (element: HTMLElement): number => {
  const parent = element.parentElement;
  const parentWidth = parent?.clientWidth ?? element.clientWidth;
  return Math.max(parentWidth, 1);
};

const getNaturalTextWidth = (text: string, font: string): number => {
  if (!text) {
    return 0;
  }

  const prepared = getPreparedWithSegments(text, font);
  let widestLineWidth = 0;
  walkLineRanges(prepared, 10_000, (line) => {
    widestLineWidth = Math.max(widestLineWidth, line.width);
  });
  return widestLineWidth;
};

const buildWidthCandidates = ({
  element,
  minLines,
  maxLines,
  preferredLines,
}: {
  element: HTMLElement;
  minLines?: number;
  maxLines?: number;
  preferredLines?: number;
}): BalancedWidthCandidate[] => {
  const text = element.textContent?.trim() ?? '';
  if (!text) {
    return [];
  }

  const maxWidth = getAvailableWidth(element);
  const font = getCanvasFont(element);
  const prepared = getPreparedWithSegments(text, font);
  const floorWidth = Math.max(Math.min(maxWidth * 0.55, maxWidth - 24), 220);
  const stepCount = 8;
  const candidates: BalancedWidthCandidate[] = [];

  for (let index = 0; index <= stepCount; index += 1) {
    const ratio = index / stepCount;
    const width = Math.round(maxWidth - (maxWidth - floorWidth) * ratio);
    const lineWidths: number[] = [];
    const lineCount = walkLineRanges(prepared, width, (line) => {
      lineWidths.push(line.width);
    });
    const widestLineWidth = lineWidths.length > 0 ? Math.max(...lineWidths) : width;
    const shortestLineWidth = lineWidths.length > 0 ? Math.min(...lineWidths) : width;
    const raggedness = widestLineWidth === 0 ? 0 : (widestLineWidth - shortestLineWidth) / widestLineWidth;

    candidates.push({
      width,
      lineCount,
      widestLineWidth,
      raggedness,
    });
  }

  const preferred = chooseBalancedWidth(candidates, {
    minLines,
    maxLines,
    preferredLines,
  });

  return preferred ? [preferred, ...candidates.filter((candidate) => candidate.width !== preferred.width)] : candidates;
};

const applyBalancedWidth = ({
  target,
  applyTo,
  slug,
  sectionId,
  blockIndex,
  codeOnOverflow,
  findings,
}: {
  target: HTMLElement;
  applyTo: HTMLElement;
  slug: string;
  sectionId?: string;
  blockIndex?: number;
  codeOnOverflow: 'TITLE_TOO_LONG' | 'THESIS_OVERFLOW' | 'QUOTE_TOO_WIDE';
  findings: PretextQaFinding[];
}): void => {
  const candidates = buildWidthCandidates({
    element: target,
    minLines: target.dataset.pretextMinLines ? Number(target.dataset.pretextMinLines) : undefined,
    maxLines: target.dataset.pretextMaxLines ? Number(target.dataset.pretextMaxLines) : undefined,
    preferredLines: target.dataset.pretextPreferredLines ? Number(target.dataset.pretextPreferredLines) : undefined,
  });

  const winner = candidates[0];
  if (!winner) {
    return;
  }

  applyTo.style.setProperty('--pretext-balanced-width', `${winner.width}px`);
  applyTo.dataset.pretextActive = 'true';
  applyTo.dataset.pretextLines = String(winner.lineCount);

  const maxLines = target.dataset.pretextMaxLines ? Number(target.dataset.pretextMaxLines) : undefined;
  if (maxLines !== undefined && winner.lineCount > maxLines) {
    findings.push(
      createQaFinding({
        code: codeOnOverflow,
        message: `${target.dataset.pretextTarget ?? 'text'} exceeds preferred ${maxLines} lines.`,
        slug,
        sectionId,
        blockIndex,
        meta: {
          lineCount: winner.lineCount,
          maxLines,
          width: winner.width,
        },
      }),
    );
  }
};

const updateNewsletterCover = (variant: OutputMode, findings: PretextQaFinding[]): void => {
  if (variant !== 'newsletter') {
    return;
  }

  const cover = document.querySelector<HTMLElement>('[data-pretext-newsletter-cover="true"]');
  const title = cover?.querySelector<HTMLElement>('.doc-header__title');
  const meta = cover?.querySelector<HTMLElement>('.doc-header__meta');
  if (!cover || !title) {
    return;
  }

  const availableWidth = Math.max(cover.parentElement?.clientWidth ?? cover.clientWidth, 1);
  const balancedWidth = Number.parseFloat(title.style.getPropertyValue('--pretext-balanced-width')) || title.clientWidth;
  const coverWidth = Math.round(Math.max(420, Math.min(availableWidth, Math.max(balancedWidth, meta?.scrollWidth ?? 0) + 88)));
  const coverRatio = coverWidth / availableWidth;
  const titleLines = toNumber(title.dataset.pretextLines, 0);
  const preferredLines = toNumber(cover.dataset.pretextCoverPreferredLines, 3);

  cover.dataset.pretextCoverActive = 'true';
  cover.style.setProperty('--pretext-cover-width', `${coverWidth}px`);

  if (coverRatio < 0.5 || coverRatio > 0.97 || titleLines > preferredLines + 1) {
    findings.push(
      createQaFinding({
        code: 'NEWSLETTER_COVER_IMBALANCE',
        message: 'Newsletter cover width is drifting away from the preferred editorial range.',
        slug: document.body.dataset.docSlug ?? 'unknown',
        meta: {
          coverWidth,
          availableWidth,
          coverRatio,
          titleLines,
          preferredLines,
        },
      }),
    );
  }
};

const estimateEvidenceColumns = ({
  grid,
  slug,
  sectionId,
  blockIndex,
  findings,
}: {
  grid: HTMLElement;
  slug: string;
  sectionId?: string;
  blockIndex?: number;
  findings: PretextQaFinding[];
}): void => {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.evidence-card'));
  if (cards.length === 0) {
    return;
  }

  const minColumns = toNumber(grid.dataset.pretextMinColumns, 1);
  const maxColumns = Math.min(toNumber(grid.dataset.pretextMaxColumns, 3), cards.length);
  const availableWidth = Math.max(grid.clientWidth, 1);
  const gap = Number.parseFloat(window.getComputedStyle(grid).gap || '16') || 16;
  const options: Array<{columns: 1 | 2 | 3; heights: number[]}> = [];

  for (let columns = minColumns; columns <= maxColumns; columns += 1) {
    const safeColumns = Math.min(Math.max(columns, 1), 3) as 1 | 2 | 3;
    const columnWidth = (availableWidth - gap * (safeColumns - 1)) / safeColumns;
    const heights = cards.map((card) => {
      const title = card.querySelector<HTMLElement>('.evidence-card__title');
      const body = card.querySelector<HTMLElement>('.evidence-card__body');
      const tag = card.querySelector<HTMLElement>('.evidence-card__tag');
      const titleText = title?.textContent?.trim() ?? '';
      const bodyText = body?.textContent?.trim() ?? '';
      const titleLineHeight = title ? getLineHeightPx(title) : 28;
      const bodyLineHeight = body ? getLineHeightPx(body) : 24;
      const titleFont = title ? getCanvasFont(title) : getCanvasFont(card);
      const bodyFont = body ? getCanvasFont(body) : getCanvasFont(card);
      const titleLines = titleText ? layout(getPrepared(titleText, titleFont), columnWidth, titleLineHeight).lineCount : 0;
      const bodyLines = bodyText ? layout(getPrepared(bodyText, bodyFont), columnWidth, bodyLineHeight).lineCount : 0;
      const style = window.getComputedStyle(card);
      const staticChrome =
        (Number.parseFloat(style.paddingTop) || 0) +
        (Number.parseFloat(style.paddingBottom) || 0) +
        (tag?.offsetHeight ?? 0) +
        (title ? Number.parseFloat(window.getComputedStyle(title).marginBottom || '0') : 0) +
        24;

      return staticChrome + titleLines * titleLineHeight + bodyLines * bodyLineHeight;
    });

    options.push({columns: safeColumns, heights});
  }

  const columns = chooseEvidenceColumns(options);
  grid.dataset.pretextColumns = String(columns);

  const winningOption = options.find((option) => option.columns === columns);
  if (!winningOption || winningOption.heights.length === 0) {
    return;
  }

  const imbalance = Math.max(...winningOption.heights) - Math.min(...winningOption.heights);
  if (imbalance > 120) {
    findings.push(
      createQaFinding({
        code: 'CARD_HEIGHT_IMBALANCE',
        message: `Evidence cards remain imbalanced at ${columns} columns.`,
        slug,
        sectionId,
        blockIndex,
        meta: {
          columns,
          imbalance,
        },
      }),
    );
  }
};

const updateStageHeroFit = (variant: OutputMode, findings: PretextQaFinding[]): void => {
  if (variant !== 'stage') {
    return;
  }

  const hero = document.querySelector<HTMLElement>('[data-pretext-stage-hero]');
  if (!hero) {
    return;
  }

  const header = hero.querySelector<HTMLElement>('.doc-header, .stage-lead-header');
  const lead = hero.querySelector<HTMLElement>('.doc-section--lead');
  const contentHeight = (header?.offsetHeight ?? 0) + (lead?.offsetHeight ?? 0);
  const state = classifyStageHeroFit({
    contentHeight,
    viewportHeight: window.innerHeight,
    maxViewportRatio: toNumber(hero.dataset.pretextMaxViewportRatio, 0.92),
  });

  hero.dataset.stageFit = state;
  hero.classList.remove('stage-fit-ok', 'stage-fit-tight', 'stage-fit-overflow');
  hero.classList.add(state);

  if (state === 'stage-fit-overflow') {
    findings.push(
      createQaFinding({
        code: 'STAGE_HERO_OVERFLOW',
        message: 'Stage hero content exceeds the current viewport height.',
        slug: document.body.dataset.docSlug ?? 'unknown',
        meta: {
          state,
          contentHeight,
          viewportHeight: window.innerHeight,
        },
      }),
    );
  }
};

const updateStageSectionCovers = (variant: OutputMode, findings: PretextQaFinding[]): void => {
  if (variant !== 'stage') {
    return;
  }

  const slug = document.body.dataset.docSlug ?? 'unknown';

  for (const section of Array.from(document.querySelectorAll<HTMLElement>('[data-pretext-section-cover]'))) {
    const state = classifyStageHeroFit({
      contentHeight: section.offsetHeight,
      viewportHeight: window.innerHeight,
      maxViewportRatio: toNumber(section.dataset.pretextMaxViewportRatio, 0.82),
    });

    section.dataset.sectionFit = state;
    section.classList.remove('stage-section-fit-ok', 'stage-section-fit-tight', 'stage-section-fit-overflow');
    section.classList.add(state.replace('stage-fit', 'stage-section-fit'));

    if (state === 'stage-fit-overflow') {
      findings.push(
        createQaFinding({
          code: 'SECTION_COVER_OVERFLOW',
          message: 'Stage section cover content exceeds the preferred viewport range.',
          slug,
          sectionId: section.dataset.pretextSectionId,
          meta: {
            contentHeight: section.offsetHeight,
            viewportHeight: window.innerHeight,
          },
        }),
      );
    }
  }
};

const updateAxisTableModes = (variant: OutputMode, findings: PretextQaFinding[]): void => {
  const slug = document.body.dataset.docSlug ?? 'unknown';

  for (const wrap of Array.from(document.querySelectorAll<HTMLElement>('[data-pretext-axis-table]'))) {
    const headers = Array.from(wrap.querySelectorAll<HTMLElement>('thead th'));
    const cells = Array.from(wrap.querySelectorAll<HTMLElement>('tbody td'));
    if (headers.length === 0 || cells.length === 0) {
      continue;
    }

    const mobileWidth = pretextConfig.qa.mobileWidth;
    const columnCount = headers.length;
    const simulatedColumnWidth = Math.max((mobileWidth - 36) / Math.max(columnCount, 1), 88);
    const perColumnNaturalWidths = new Array(columnCount).fill(0) as number[];
    let maxCellLineCount = 1;
    let totalCellLineCount = 0;
    let measuredCellCount = 0;

    const collectMetrics = (nodes: HTMLElement[], offset = 0): void => {
      nodes.forEach((node, index) => {
        const text = node.textContent?.trim() ?? '';
        if (!text) {
          return;
        }

        const font = getCanvasFont(node);
        const lineHeight = getLineHeightPx(node);
        const lineCount = layout(getPrepared(text, font), simulatedColumnWidth, lineHeight).lineCount;
        const naturalWidth = getNaturalTextWidth(text, font);
        const columnIndex = index % columnCount;

        perColumnNaturalWidths[columnIndex] = Math.max(perColumnNaturalWidths[columnIndex] ?? 0, naturalWidth + offset);
        maxCellLineCount = Math.max(maxCellLineCount, lineCount);
        totalCellLineCount += lineCount;
        measuredCellCount += 1;
      });
    };

    collectMetrics(headers, 34);
    collectMetrics(cells, 44);

    const averageCellLineCount = measuredCellCount > 0 ? totalCellLineCount / measuredCellCount : 1;
    const estimatedMinTableWidth = perColumnNaturalWidths.reduce(
      (sum, width) => sum + Math.min(Math.max(width, 112), 240),
      0,
    );
    const risk = classifyAxisTableRisk({
      availableWidth: mobileWidth,
      columnCount,
      estimatedMinTableWidth,
      maxCellLineCount,
      averageCellLineCount,
    });
    const shouldShowCards =
      risk === 'high' &&
      (window.innerWidth <= pretextConfig.qa.tabletWidth || variant === 'stage');

    wrap.dataset.axisTableRisk = risk;
    wrap.dataset.axisTableView = shouldShowCards ? 'cards' : 'table';

    if (risk === 'high') {
      findings.push(
        createQaFinding({
          code: 'AXIS_TABLE_MOBILE_RISK',
          message: 'Axis table content is too dense for the current mobile comparison layout.',
          slug,
          sectionId: wrap.dataset.pretextSectionId,
          blockIndex: wrap.dataset.pretextBlockIndex ? Number(wrap.dataset.pretextBlockIndex) : undefined,
          meta: {
            columnCount,
            estimatedMinTableWidth,
            maxCellLineCount,
            averageCellLineCount,
            view: wrap.dataset.axisTableView,
          },
        }),
      );
    }
  }
};

const updateWrapFigureLayouts = (variant: OutputMode): void => {
  if (variant !== 'newsletter') {
    return;
  }

  for (const container of Array.from(document.querySelectorAll<HTMLElement>('[data-pretext-wrap-figure="true"]'))) {
    const prose = container.querySelector<HTMLElement>('[data-pretext-wrap-prose]');
    const image = container.querySelector<HTMLImageElement>('.image-block--wrap img');
    if (!prose || !image) {
      continue;
    }

    const text = prose.textContent?.trim() ?? '';
    if (!text) {
      continue;
    }

    const containerWidth = Math.max(container.clientWidth, 1);
    const figureWidth = Math.round(Math.min(containerWidth * 0.44, 320));
    const naturalHeight =
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? (figureWidth / image.naturalWidth) * image.naturalHeight
        : image.getBoundingClientRect().height;
    const lineHeight = getLineHeightPx(prose);
    const narrowLineCount = Math.max(2, Math.ceil(Math.max(naturalHeight, image.getBoundingClientRect().height) / lineHeight));
    const narrowSlotWidth = Math.max(containerWidth - figureWidth - 28, 1);
    const font = getCanvasFont(prose);
    const fullWidthLineCount = layout(getPrepared(text, font), containerWidth, lineHeight).lineCount;
    const prepared = getPreparedWithSegments(text, font);

    let wrappedLineCount = 0;
    let cursor = {segmentIndex: 0, graphemeIndex: 0};

    for (let index = 0; index < narrowLineCount; index += 1) {
      const line = layoutNextLine(prepared, cursor, narrowSlotWidth);
      if (!line) {
        break;
      }

      cursor = line.end;
      wrappedLineCount += 1;
    }

    for (;;) {
      const line = layoutNextLine(prepared, cursor, containerWidth);
      if (!line) {
        break;
      }

      cursor = line.end;
      wrappedLineCount += 1;
    }

    const mode = decideWrapFigureMode({
      narrowLineCount,
      narrowSlotWidth,
      fullWidthLineCount,
      wrappedLineCount,
    });

    container.dataset.wrapMode = mode;
    container.style.setProperty('--pretext-wrap-figure-width', `${figureWidth}px`);
    container.style.setProperty('--pretext-wrap-gap', '1.35rem');
  }
};

const updateManualRichLines = (): void => {
  for (const source of Array.from(document.querySelectorAll<HTMLElement>('[data-pretext-manual-lines="true"]'))) {
    const rich = parseRichBlockContent(source.dataset.pretextRich);
    const shell = source.closest<HTMLElement>('.pretext-rich-shell');
    const overlay = shell?.querySelector<HTMLElement>('[data-pretext-rich-overlay="true"]');
    if (!rich || !overlay) {
      delete source.dataset.pretextRichActive;
      continue;
    }

    const maxWidth = Math.max(source.clientWidth, shell?.clientWidth ?? 0, 1);
    const prepared = getPreparedWithSegments(rich.plainText, getCanvasFont(source));
    const ranges: Array<{start: {segmentIndex: number; graphemeIndex: number}; end: {segmentIndex: number; graphemeIndex: number}}> = [];

    walkLineRanges(prepared, maxWidth, (line) => {
      ranges.push({
        start: line.start,
        end: line.end,
      });
    });

    if (ranges.length === 0) {
      overlay.replaceChildren();
      delete source.dataset.pretextRichActive;
      continue;
    }

    const lines = buildRichTextLines({
      content: rich,
      preparedSegments: prepared.segments,
      ranges,
    });

    overlay.replaceChildren(createRichLineElements(document, lines));
    source.dataset.pretextRichActive = 'true';
    overlay.dataset.pretextRichActive = 'true';
  }
};

const measureAllTargets = (variant: OutputMode): void => {
  const slug = document.body.dataset.docSlug ?? 'unknown';
  const findings: PretextQaFinding[] = [];

  for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-pretext]'))) {
    const applyTarget =
      element.dataset.pretextApplyClosest
        ? element.closest<HTMLElement>(element.dataset.pretextApplyClosest)
        : element;
    const target = applyTarget ?? element;
    const sectionId = element.dataset.pretextSectionId || undefined;
    const blockIndex = element.dataset.pretextBlockIndex ? Number(element.dataset.pretextBlockIndex) : undefined;

    if (element.dataset.pretext === 'measure-card') {
      estimateEvidenceColumns({
        grid: element,
        slug,
        sectionId,
        blockIndex,
        findings,
      });
      continue;
    }

    if (element.dataset.pretext === 'balance-title') {
      applyBalancedWidth({
        target: element,
        applyTo: target,
        slug,
        sectionId,
        blockIndex,
        codeOnOverflow: 'TITLE_TOO_LONG',
        findings,
      });
      continue;
    }

    if (element.dataset.pretext === 'shrink-wrap') {
      const targetType = element.dataset.pretextTarget;
      applyBalancedWidth({
        target: element,
        applyTo: target,
        slug,
        sectionId,
        blockIndex,
        codeOnOverflow: targetType === 'thesis' ? 'THESIS_OVERFLOW' : 'QUOTE_TOO_WIDE',
        findings,
      });
    }
  }

  updateNewsletterCover(variant, findings);
  updateStageHeroFit(variant, findings);
  updateStageSectionCovers(variant, findings);
  updateAxisTableModes(variant, findings);
  updateWrapFigureLayouts(variant);
  updateManualRichLines();
  window.__ACHMAGE_PRETEXT_QA__ = dedupeQaFindings(findings);
};

const scheduleMeasure = (variant: OutputMode): (() => void) => {
  let frame = 0;

  return () => {
    if (frame) {
      window.cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;
      measureAllTargets(variant);
    });
  };
};

export const initPretextEnhancer = (variant: OutputMode): void => {
  if (!pretextConfig.enabled || !pretextConfig.outputs[variant]) {
    return;
  }

  const initKey = `${variant}:${document.body.dataset.docSlug ?? 'unknown'}`;
  window.__ACHMAGE_PRETEXT_INIT__ ??= new Set<string>();
  if (window.__ACHMAGE_PRETEXT_INIT__.has(initKey)) {
    return;
  }

  window.__ACHMAGE_PRETEXT_INIT__.add(initKey);
  window.__ACHMAGE_PRETEXT_QA__ = [];

  const schedule = scheduleMeasure(variant);
  const resizeObserver = new ResizeObserver(() => schedule());
  resizeObserver.observe(document.body);

  const visibleObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        schedule();
      }
    },
    {
      rootMargin: '220px 0px',
      threshold: [0, 0.2],
    },
  );

  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-pretext], [data-pretext-manual-lines="true"], [data-pretext-newsletter-cover], [data-pretext-axis-table], [data-pretext-section-cover], [data-pretext-wrap-figure]',
    ),
  )) {
    visibleObserver.observe(element);
  }

  for (const image of Array.from(document.querySelectorAll<HTMLImageElement>('[data-pretext-wrap-figure] img'))) {
    if (image.complete) {
      continue;
    }

    image.addEventListener('load', schedule, {once: true});
    image.addEventListener('error', schedule, {once: true});
  }

  window.addEventListener('resize', schedule, {passive: true});

  const fontsReady = document.fonts?.ready;
  if (fontsReady) {
    fontsReady.then(() => schedule()).catch(() => schedule());
  }

  schedule();
};
