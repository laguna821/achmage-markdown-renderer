import {useEffect, useMemo, useState, type CSSProperties} from 'react';

import type {NormalizedDoc, OutputMode, ThemeMode} from '../core/content';
import {openExternal} from '../lib/bridge';
import {buildStageDeck} from '../stage';

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

const STAGE_DOCK_BREAKPOINT = 1120;

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

export function StageDocumentView({doc, theme, onNavigateDoc}: StageDocumentViewProps) {
  const deck = useMemo(() => buildStageDeck(doc), [doc]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'dock' | 'compact'>('dock');

  const currentGroup = deck.groups[groupIndex] ?? deck.groups[0];
  const currentFrame = currentGroup?.frames[frameIndex] ?? currentGroup?.frames[0];
  const currentFrameCount = currentGroup?.frames.length ?? 0;
  const hasVerticalFrames = currentFrameCount > 1;
  const hasFrameBody = (currentFrame?.blocks.length ?? 0) > 0;
  const currentFrameFocusScale = currentFrame?.focusScale ?? 1;
  const currentFrameContentKind =
    currentFrame?.blocks.length === 1 ? currentFrame.blocks[0]?.kind ?? 'mixed' : 'mixed';
  const currentFrameSoloBlockKind = currentFrame?.blocks.length === 1 ? currentFrame.blocks[0]?.kind : undefined;
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
      setHeaderHeight(Math.ceil(header?.getBoundingClientRect().height ?? 0));
      setLayoutMode(window.innerWidth < STAGE_DOCK_BREAKPOINT ? 'compact' : 'dock');
    };

    syncStageMetrics();
    window.addEventListener('resize', syncStageMetrics);

    return () => {
      window.removeEventListener('resize', syncStageMetrics);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    onFullscreenChange();
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
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

  const stageHeight = headerHeight > 0 ? `calc(100dvh - ${headerHeight}px)` : '100dvh';

  if (!currentGroup || !currentFrame) {
    return null;
  }

  const sectionHeading =
    currentGroup.kind !== 'lead' ? (
      isLightStageTheme ? (
        <div className="stage-section-heading" data-stage-heading-style="title-above-rule">
          <h2 className="doc-section__title" id={!currentFrame.continued ? currentFrame.sectionId : undefined}>
            {currentFrame.title}
            {currentFrame.continued ? <span className="stage-frame__continued">CONT.</span> : null}
          </h2>
          <div className="stage-section-heading__rule" aria-hidden="true" />
        </div>
      ) : (
        <h2 className="doc-section__title" id={!currentFrame.continued ? currentFrame.sectionId : undefined}>
          {currentFrame.title}
          {currentFrame.continued ? <span className="stage-frame__continued">CONT.</span> : null}
        </h2>
      )
    ) : null;

  return (
    <main
      className="stage-shell"
      data-stage-root="true"
      data-stage-layout-mode={layoutMode}
      style={
        {
          '--stage-viewport-height': stageHeight,
          height: stageHeight,
          minHeight: stageHeight,
        } as CSSProperties
      }
    >
      <aside className="stage-shell__status-dock" data-stage-status-dock="true">
        <div className="stage-shell__status">
          <div className="stage-shell__status-title">{currentGroup.title}</div>
          <div className="stage-shell__status-meta">
            <span data-stage-group-counter="true">
              {groupIndex + 1} / {deck.groups.length}
            </span>
            {hasVerticalFrames ? (
              <span data-stage-frame-counter="true">
                {groupIndex + 1}-{frameIndex + 1}
              </span>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="stage-shell__viewport-shell">
        <div className="stage-shell__viewport">
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

          <div className="stage-shell__deck">
            <div className="stage-paper" data-stage-group-index={groupIndex} data-stage-frame-index={frameIndex}>
              <div
                className="doc-paper doc-paper--stage stage-frame"
                data-stage-layout-intent={currentFrame.layoutIntent}
                data-stage-frame-has-body={hasFrameBody ? 'true' : 'false'}
                data-stage-focus-scale={String(currentFrameFocusScale)}
                data-stage-solo-block-kind={currentFrameSoloBlockKind}
                style={{'--stage-focus-scale': String(currentFrameFocusScale)} as CSSProperties}
              >
                {currentFrame.includeDocumentHeader ? <DocumentHeader doc={doc} variant="stage" /> : null}

                {hasFrameBody ? (
                  <section
                    className={`doc-section${currentGroup.kind === 'lead' ? ' doc-section--lead' : ''}${currentFrame.continued ? ' stage-frame__section--continued' : ''}`}
                    data-stage-article="true"
                    data-section-id={currentFrame.sectionId ?? currentGroup.id}
                    data-stage-frame-content-kind={currentFrameContentKind}
                    data-stage-layout-intent={currentFrame.layoutIntent}
                    data-stage-frame-has-body="true"
                    data-stage-focus-scale={String(currentFrameFocusScale)}
                    data-stage-solo-block-kind={currentFrameSoloBlockKind}
                  >
                    {sectionHeading}
                    <div className="doc-section__blocks" data-stage-frame-content-kind={currentFrameContentKind}>
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
                  </section>
                ) : null}
              </div>
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
        </div>

        <div className="stage-shell__controls-bar">
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
            <button type="button" className="stage-shell__control" aria-label="Toggle fullscreen" onClick={() => void onToggleFullscreen()}>
              {isFullscreen ? 'Exit' : 'Full'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
