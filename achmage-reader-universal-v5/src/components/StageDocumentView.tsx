import {useEffect, useMemo, useState, type CSSProperties} from 'react';

import type {NormalizedDoc, OutputMode, ThemeMode} from '../core/content';
import {openExternal} from '../lib/bridge';
import {buildStageDeck, createStageTypographyConfig, DEFAULT_STAGE_VIEWPORT_BUDGET, type StageViewportBudget} from '../stage';
import {getStageTypographyScale} from '../stage/scale';

import {handleArticleLinkClick, type ArticleLinkDebugEntry} from './document-links';
import {BlockRenderer} from './BlockRenderer';
import {DocumentHeader} from './DocumentHeader';

type StageDocumentViewProps = {
  doc: NormalizedDoc;
  theme: ThemeMode;
  onNavigateDoc: (output: OutputMode, slug: string, anchor?: string) => void;
};

declare global {
  interface Window {
    __ACHMAGE_LINK_DEBUG__?: ArticleLinkDebugEntry[];
  }
}

const STAGE_ROOT_PAD_X = 18;
const STAGE_ROOT_PAD_TOP = 16;
const STAGE_ROOT_PAD_BOTTOM = 12;

const getViewportSize = () => ({
  width: typeof window === 'undefined' ? DEFAULT_STAGE_VIEWPORT_BUDGET.width : window.innerWidth,
  height: typeof window === 'undefined' ? DEFAULT_STAGE_VIEWPORT_BUDGET.height : window.innerHeight,
});

const isNavigationTarget = (event: KeyboardEvent): boolean => {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const target = event.target as HTMLElement | null;
  if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
    return false;
  }

  return true;
};

const resolveStageViewportBudget = ({
  viewportWidth,
  viewportHeight,
  headerHeight,
}: {
  viewportWidth: number;
  viewportHeight: number;
  headerHeight: number;
}): StageViewportBudget => {
  const stageHeight = Math.max(viewportHeight - headerHeight, 320);
  const canvasWidth = Math.max(viewportWidth - STAGE_ROOT_PAD_X * 2, 640);
  const canvasHeight = Math.max(stageHeight - STAGE_ROOT_PAD_TOP - STAGE_ROOT_PAD_BOTTOM, 420);

  return {
    width: canvasWidth,
    height: canvasHeight,
    rightRailReserve: DEFAULT_STAGE_VIEWPORT_BUDGET.rightRailReserve,
    bottomControlsReserve: DEFAULT_STAGE_VIEWPORT_BUDGET.bottomControlsReserve,
    headingReserve: DEFAULT_STAGE_VIEWPORT_BUDGET.headingReserve,
    continuedHeadingReserve: DEFAULT_STAGE_VIEWPORT_BUDGET.continuedHeadingReserve,
    blockGap: DEFAULT_STAGE_VIEWPORT_BUDGET.blockGap,
  };
};

export function StageDocumentView({doc, theme, onNavigateDoc}: StageDocumentViewProps) {
  const initialViewport = getViewportSize();
  const [groupIndex, setGroupIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(initialViewport.width);
  const [viewportHeight, setViewportHeight] = useState(initialViewport.height);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewportBudget = useMemo(
    () =>
      resolveStageViewportBudget({
        viewportWidth,
        viewportHeight,
        headerHeight,
      }),
    [headerHeight, viewportHeight, viewportWidth],
  );

  const deck = useMemo(() => buildStageDeck(doc, viewportBudget), [doc, viewportBudget]);
  const stageScale = useMemo(() => getStageTypographyScale(deck.scalePreset), [deck.scalePreset]);
  const stageTypography = useMemo(
    () =>
      createStageTypographyConfig({
        preset: deck.scalePreset,
        contentWidth: Math.max(viewportBudget.width - viewportBudget.rightRailReserve - stageScale.cardPadding * 2, 320),
      }),
    [deck.scalePreset, stageScale.cardPadding, viewportBudget.rightRailReserve, viewportBudget.width],
  );

  const currentGroup = deck.groups[groupIndex] ?? deck.groups[0];
  const currentFrame = currentGroup?.frames[frameIndex] ?? currentGroup?.frames[0];
  const currentFrameCount = currentGroup?.frames.length ?? 0;
  const hasVerticalFrames = currentFrameCount > 1;
  const hasFrameBody = (currentFrame?.blocks.length ?? 0) > 0;
  const currentFrameFocusScale = currentFrame?.focusScale ?? 1;
  const currentFrameAvailableHeight = currentFrame?.availableHeight ?? 0;
  const currentFrameContentKind =
    currentFrame?.blocks.length === 1 ? currentFrame.blocks[0]?.kind ?? 'mixed' : 'mixed';
  const currentFrameSoloBlockKind = currentFrame?.blocks.length === 1 ? currentFrame.blocks[0]?.kind : undefined;
  const currentVerticalBalance =
    currentFrame?.layoutIntent === 'section-text' && (currentFrame?.occupancyRatio ?? 1) <= 0.78 ? 'center' : 'start';
  const isLightStageTheme = theme === 'light';

  const moveToGroup = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, deck.groups.length - 1));
    setGroupIndex(clamped);
    setFrameIndex(0);
  };

  const moveToFrame = (nextIndex: number) => {
    if (!currentGroup) {
      return;
    }

    const clamped = Math.max(0, Math.min(nextIndex, currentGroup.frames.length - 1));
    setFrameIndex(clamped);
  };

  const moveToPreviousGroup = () => {
    moveToGroup(groupIndex - 1);
  };

  const moveToNextGroup = () => {
    moveToGroup(groupIndex + 1);
  };

  const moveToFirstGroup = () => {
    setGroupIndex(0);
    setFrameIndex(0);
  };

  const moveToLastGroup = () => {
    setGroupIndex(Math.max(deck.groups.length - 1, 0));
    setFrameIndex(0);
  };

  const moveToPreviousFrame = () => {
    moveToFrame(frameIndex - 1);
  };

  const moveToNextFrame = () => {
    moveToFrame(frameIndex + 1);
  };

  const moveToPreviousLogical = () => {
    if (frameIndex > 0) {
      setFrameIndex(0);
      return;
    }

    moveToPreviousGroup();
  };

  const advance = () => {
    if (!currentGroup) {
      return;
    }

    if (frameIndex < currentGroup.frames.length - 1) {
      setFrameIndex((current) => current + 1);
      return;
    }

    if (groupIndex < deck.groups.length - 1) {
      setGroupIndex((current) => current + 1);
      setFrameIndex(0);
    }
  };

  const retreatWithinStage = () => {
    if (frameIndex > 0) {
      moveToPreviousFrame();
      return;
    }

    moveToPreviousLogical();
  };

  useEffect(() => {
    setGroupIndex(0);
    setFrameIndex(0);
  }, [doc.slug]);

  useEffect(() => {
    const syncStageMetrics = () => {
      const header = document.querySelector<HTMLElement>('.site-header');
      const nextViewport = getViewportSize();
      setHeaderHeight(Math.ceil(header?.getBoundingClientRect().height ?? 0));
      setViewportWidth(nextViewport.width);
      setViewportHeight(nextViewport.height);
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncStageMetrics();
    window.addEventListener('resize', syncStageMetrics);
    document.addEventListener('fullscreenchange', syncStageMetrics);

    return () => {
      window.removeEventListener('resize', syncStageMetrics);
      document.removeEventListener('fullscreenchange', syncStageMetrics);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({top: 0, behavior: 'auto'});
  }, [doc.slug, groupIndex, frameIndex]);

  useEffect(() => {
    const syncFromHash = () => {
      if (!window.location.hash) {
        return;
      }

      const anchor = decodeURIComponent(window.location.hash.slice(1));
      const nextGroupIndex = deck.groups.findIndex((group) => group.sectionId === anchor || group.id === anchor);
      if (nextGroupIndex >= 0) {
        setGroupIndex(nextGroupIndex);
        setFrameIndex(0);
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);

    return () => {
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, [deck.groups]);

  useEffect(() => {
    if (!deck.keyboardNav) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isNavigationTarget(event)) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveToPreviousLogical();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        moveToNextGroup();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        retreatWithinStage();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        advance();
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        advance();
        return;
      }

      if (event.key === 'PageUp') {
        event.preventDefault();
        moveToPreviousLogical();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        moveToFirstGroup();
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        moveToLastGroup();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [advance, deck.keyboardNav, frameIndex, groupIndex, currentGroup]);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('.stage-frame [data-stage-article="true"]');
    if (!article) {
      return;
    }

    const recordLinkDebug = (entry: ArticleLinkDebugEntry) => {
      if (!import.meta.env.DEV) {
        return;
      }

      const nextEntries = [...(window.__ACHMAGE_LINK_DEBUG__ ?? []), entry];
      window.__ACHMAGE_LINK_DEBUG__ = nextEntries.slice(-30);
    };

    const onArticleClick = (event: MouseEvent) => {
      void handleArticleLinkClick({
        event,
        currentHref: window.location.href,
        onDocRoute: (nextOutput, slug, anchor) => {
          onNavigateDoc(nextOutput, slug, anchor);
        },
        onHash: (id) => {
          const nextGroupIndex = deck.groups.findIndex((group) => group.sectionId === id || group.id === id);
          if (nextGroupIndex >= 0) {
            setGroupIndex(nextGroupIndex);
            setFrameIndex(0);
          }
          window.history.pushState(null, '', `#${encodeURIComponent(id)}`);
        },
        onExternal: (href) => {
          void openExternal(href);
        },
        onDebug: recordLinkDebug,
      });
    };

    article.addEventListener('click', onArticleClick, true);

    return () => {
      article.removeEventListener('click', onArticleClick, true);
    };
  }, [deck.groups, doc.slug, frameIndex, groupIndex, onNavigateDoc]);

  const onToggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }

    await document.documentElement.requestFullscreen?.();
  };

  const stageHeightPx = Math.max(viewportHeight - headerHeight, 320);
  const stageHeight = `${stageHeightPx}px`;

  if (!currentGroup || !currentFrame) {
    return null;
  }

  const surfaceHeading =
    !currentFrame.includeDocumentHeader ? (
      isLightStageTheme ? (
        <div className="stage-section-heading" data-stage-heading-style="title-above-rule">
          <h2
            className="stage-surface__title"
            id={!currentFrame.continued ? currentFrame.sectionId : undefined}
            data-stage-continued={currentFrame.continued ? 'true' : undefined}
          >
            <span className="stage-surface__title-text">{currentFrame.title}</span>
            {currentFrame.continued ? (
              <em className="stage-surface__continued-inline" data-stage-continued-inline="true">
                (cont.)
              </em>
            ) : null}
          </h2>
          <div className="stage-section-heading__rule" aria-hidden="true" />
        </div>
      ) : (
        <div className="stage-surface__heading" data-stage-heading-style="rule-above-title">
          <h2
            className="stage-surface__title"
            id={!currentFrame.continued ? currentFrame.sectionId : undefined}
            data-stage-continued={currentFrame.continued ? 'true' : undefined}
          >
            <span className="stage-surface__title-text">{currentFrame.title}</span>
            {currentFrame.continued ? (
              <em className="stage-surface__continued-inline" data-stage-continued-inline="true">
                (cont.)
              </em>
            ) : null}
          </h2>
        </div>
      )
    ) : null;

  return (
    <main
      className="stage-shell"
      data-stage-root="true"
      data-stage-scale-preset={deck.scalePreset}
      style={
        {
          height: stageHeight,
          minHeight: stageHeight,
          '--stage-root-height': stageHeight,
          '--stage-root-pad-x': `${STAGE_ROOT_PAD_X}px`,
          '--stage-root-pad-top': `${STAGE_ROOT_PAD_TOP}px`,
          '--stage-root-pad-bottom': `${STAGE_ROOT_PAD_BOTTOM}px`,
        } as CSSProperties
      }
    >
      <div
        className="stage-canvas"
        data-stage-canvas="true"
        data-stage-scale-preset={deck.scalePreset}
        data-stage-budget-width={String(viewportBudget.width)}
        data-stage-budget-height={String(viewportBudget.height)}
        style={
          {
            '--stage-rail-reserve': `${viewportBudget.rightRailReserve}px`,
            '--stage-controls-reserve': `${viewportBudget.bottomControlsReserve}px`,
            '--stage-surface-pad-x': `${stageScale.cardPadding}px`,
            '--stage-surface-pad-y': `${stageScale.cardPadding}px`,
            '--stage-surface-gap': `${stageScale.surfaceGap}px`,
            '--stage-meta-size': `${stageScale.meta}px`,
            '--stage-meta-line-height': `${stageScale.metaLineHeight}px`,
            '--stage-kicker-size': `${stageScale.kicker}px`,
            '--stage-kicker-line-height': `${stageScale.kickerLineHeight}px`,
            '--stage-lead-title-size': `${stageScale.leadTitle}px`,
            '--stage-lead-title-line-height': `${stageScale.leadTitleLineHeight}px`,
            '--stage-section-title-size': `${stageScale.sectionTitle}px`,
            '--stage-section-title-line-height': `${stageScale.sectionTitleLineHeight}px`,
            '--stage-subheading-size': `${stageScale.subheading}px`,
            '--stage-subheading-line-height': `${stageScale.subheadingLineHeight}px`,
            '--stage-body-size': `${stageScale.body}px`,
            '--stage-body-line-height': `${stageScale.bodyLineHeight}px`,
            '--stage-list-size': `${stageScale.list}px`,
            '--stage-list-line-height': `${stageScale.listLineHeight}px`,
            '--stage-quote-size': `${stageScale.quote}px`,
            '--stage-quote-line-height': `${stageScale.quoteLineHeight}px`,
            '--stage-callout-title-size': `${stageScale.calloutTitle}px`,
            '--stage-callout-title-line-height': `${stageScale.calloutTitleLineHeight}px`,
            '--stage-callout-body-size': `${stageScale.calloutBody}px`,
            '--stage-callout-body-line-height': `${stageScale.calloutBodyLineHeight}px`,
            '--stage-code-size': `${stageScale.code}px`,
            '--stage-code-line-height': `${stageScale.codeLineHeight}px`,
            '--stage-card-padding': `${stageScale.cardPadding}px`,
            '--stage-continued-pill-size': `${stageScale.continuedPill}px`,
            '--stage-lead-title-measure': `${stageTypography.leadTitleWidth}px`,
            '--stage-prose-measure': `${stageTypography.proseMeasureWidth}px`,
            '--stage-list-measure': `${stageTypography.listMeasureWidth}px`,
            '--stage-subheading-measure': `${stageTypography.subheadingMeasureWidth}px`,
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--left"
          aria-label="Previous stage step"
          onClick={retreatWithinStage}
        />
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--right"
          aria-label="Next stage step"
          onClick={advance}
        />

        <div className="stage-canvas__content">
          <div
            className="stage-frame"
            data-stage-layout-intent={currentFrame.layoutIntent}
            data-stage-frame-has-body={hasFrameBody ? 'true' : 'false'}
            data-stage-scale-preset={currentFrame.scalePreset}
            data-stage-focus-scale={String(currentFrameFocusScale)}
            data-stage-solo-block-kind={currentFrameSoloBlockKind}
            data-stage-available-height={String(currentFrameAvailableHeight)}
            data-stage-vertical-balance={currentVerticalBalance}
            style={
              {
                '--stage-focus-scale': String(currentFrameFocusScale),
                '--stage-packed-body-budget': String(currentFrameAvailableHeight),
              } as CSSProperties
            }
          >
            <section
              className={`stage-surface${currentFrame.continued ? ' stage-surface--continued' : ''}${
                currentFrame.includeDocumentHeader ? ' stage-surface--lead' : ''
              }`}
              data-stage-surface="true"
              data-stage-article="true"
              data-section-id={currentFrame.sectionId ?? currentGroup.id}
              data-stage-frame-content-kind={currentFrameContentKind}
              data-stage-layout-intent={currentFrame.layoutIntent}
              data-stage-frame-has-body={hasFrameBody ? 'true' : 'false'}
              data-stage-scale-preset={currentFrame.scalePreset}
              data-stage-focus-scale={String(currentFrameFocusScale)}
              data-stage-solo-block-kind={currentFrameSoloBlockKind}
              data-stage-available-height={String(currentFrameAvailableHeight)}
              data-stage-vertical-balance={currentVerticalBalance}
            >
              {currentFrame.includeDocumentHeader ? (
                <div className="stage-lead-shell" data-stage-lead-shell="true">
                  <DocumentHeader doc={doc} variant="stage" />
                </div>
              ) : null}
              {surfaceHeading}

              {hasFrameBody ? (
                <div
                  className="stage-surface__body"
                  data-stage-surface-body="true"
                  data-stage-frame-content-kind={currentFrameContentKind}
                  data-stage-vertical-balance={currentVerticalBalance}
                >
                  {currentFrame.blocks.map((block, blockIndex) => (
                    <BlockRenderer
                      key={`${currentFrame.id}-${block.kind}-${blockIndex}`}
                      block={block}
                      variant="stage"
                      doc={doc}
                      sectionId={currentFrame.sectionId ?? currentGroup.id}
                      blockIndex={blockIndex}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <aside
          className="stage-shell__frame-rail"
          data-stage-frame-rail="true"
          data-stage-frame-count={currentFrameCount}
          aria-label="Stage frames"
          hidden={!hasVerticalFrames}
        >
          <button
            type="button"
            className="stage-shell__frame-button"
            aria-label="Previous stage frame"
            onClick={moveToPreviousFrame}
            disabled={frameIndex === 0}
          >
            ^
          </button>
          <div className="stage-shell__frame-dots">
            {currentGroup.frames.map((frame, index) => (
              <button
                key={frame.id}
                type="button"
                className={`stage-shell__frame-dot${index === frameIndex ? ' stage-shell__frame-dot--active' : ''}`}
                aria-label={`Go to frame ${index + 1}`}
                onClick={() => setFrameIndex(index)}
              />
            ))}
          </div>
          <button
            type="button"
            className="stage-shell__frame-button"
            aria-label="Next stage frame"
            onClick={moveToNextFrame}
            disabled={frameIndex === currentFrameCount - 1}
          >
            v
          </button>
        </aside>

        <div className="stage-shell__controls-bar" data-stage-controls-bar="true">
          <div className="stage-shell__controls-panel">
            <div className="stage-shell__controls-meta">
              <span data-stage-group-counter="true">
                {groupIndex + 1} / {deck.groups.length}
              </span>
              {hasVerticalFrames ? (
                <span data-stage-frame-counter="true">
                  {groupIndex + 1}-{frameIndex + 1}
                </span>
              ) : null}
            </div>
            <div className="stage-shell__controls">
              <button type="button" className="stage-shell__control" aria-label="First stage group" onClick={moveToFirstGroup}>
                |&lt;
              </button>
              <button type="button" className="stage-shell__control" aria-label="Previous stage group" onClick={moveToPreviousGroup}>
                &lt;
              </button>
              <button type="button" className="stage-shell__control" aria-label="Next stage group" onClick={moveToNextGroup}>
                &gt;
              </button>
              <button type="button" className="stage-shell__control" aria-label="Last stage group" onClick={moveToLastGroup}>
                &gt;|
              </button>
              <button
                type="button"
                className="stage-shell__control"
                aria-label="Toggle fullscreen"
                onClick={() => void onToggleFullscreen()}
              >
                {isFullscreen ? 'Exit' : 'Full'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
