import {useEffect, useMemo, useState, type CSSProperties} from 'react';

import type {NormalizedDoc, OutputMode} from '../core/content';
import {openExternal} from '../lib/bridge';
import {buildStageDeck} from '../stage';

import {handleArticleLinkClick, type ArticleLinkDebugEntry} from './document-links';
import {BlockRenderer} from './BlockRenderer';
import {DocumentHeader} from './DocumentHeader';

type StageDocumentViewProps = {
  doc: NormalizedDoc;
  onNavigateDoc: (output: OutputMode, slug: string, anchor?: string) => void;
};

declare global {
  interface Window {
    __ACHMAGE_LINK_DEBUG__?: ArticleLinkDebugEntry[];
  }
}

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

export function StageDocumentView({doc, onNavigateDoc}: StageDocumentViewProps) {
  const deck = useMemo(() => buildStageDeck(doc), [doc]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentGroup = deck.groups[groupIndex] ?? deck.groups[0];
  const currentFrame = currentGroup?.frames[frameIndex] ?? currentGroup?.frames[0];

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

  useEffect(() => {
    setGroupIndex(0);
    setFrameIndex(0);
  }, [doc.slug]);

  useEffect(() => {
    const syncHeaderHeight = () => {
      const header = document.querySelector<HTMLElement>('.site-header');
      setHeaderHeight(Math.ceil(header?.getBoundingClientRect().height ?? 0));
    };

    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);

    return () => {
      window.removeEventListener('resize', syncHeaderHeight);
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
        moveToGroup(groupIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveToGroup(groupIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveToFrame(frameIndex - 1);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveToFrame(frameIndex + 1);
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        advance();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setGroupIndex(0);
        setFrameIndex(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setGroupIndex(Math.max(deck.groups.length - 1, 0));
        setFrameIndex(0);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [advance, deck.groups.length, deck.keyboardNav, frameIndex, groupIndex, currentGroup]);

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

  return (
    <main
      className="stage-shell"
      data-stage-root="true"
      style={
        {
          '--stage-viewport-height': stageHeight,
          height: stageHeight,
          minHeight: stageHeight,
        } as CSSProperties
      }
    >
      <div className="stage-shell__viewport">
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--left"
          aria-label="Previous stage group"
          onClick={() => moveToGroup(groupIndex - 1)}
        />
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--right"
          aria-label="Next stage group"
          onClick={() => moveToGroup(groupIndex + 1)}
        />
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--top"
          aria-label="Previous stage frame"
          onClick={() => moveToFrame(frameIndex - 1)}
        />
        <button
          type="button"
          className="stage-shell__nav-zone stage-shell__nav-zone--bottom"
          aria-label="Next stage frame"
          onClick={() => moveToFrame(frameIndex + 1)}
        />

        <div className="stage-shell__deck">
          <div className="stage-paper" data-stage-group-index={groupIndex} data-stage-frame-index={frameIndex}>
            <div className="doc-paper doc-paper--stage stage-frame">
              {currentFrame.includeDocumentHeader ? <DocumentHeader doc={doc} variant="stage" /> : null}

              <section
                className={`doc-section${currentGroup.kind === 'lead' ? ' doc-section--lead' : ''}${currentFrame.continued ? ' stage-frame__section--continued' : ''}`}
                data-stage-article="true"
                data-section-id={currentFrame.sectionId ?? currentGroup.id}
              >
                {currentGroup.kind !== 'lead' ? (
                  <h2 className="doc-section__title" id={!currentFrame.continued ? currentFrame.sectionId : undefined}>
                    {currentFrame.title}
                    {currentFrame.continued ? <span className="stage-frame__continued">CONT.</span> : null}
                  </h2>
                ) : null}
                <div className="doc-section__blocks">
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
            </div>
          </div>
        </div>

        <aside className="stage-shell__group-dots" aria-label="Stage groups">
          {deck.groups.map((group, index) => (
            <button
              key={group.id}
              type="button"
              className={`stage-shell__dot${index === groupIndex ? ' stage-shell__dot--active' : ''}`}
              aria-label={`Go to group ${index + 1}: ${group.title}`}
              onClick={() => {
                setGroupIndex(index);
                setFrameIndex(0);
              }}
            />
          ))}
        </aside>

        <div className="stage-shell__hud">
          <div className="stage-shell__status">
            <div className="stage-shell__status-title">{currentGroup.title}</div>
            <div className="stage-shell__status-meta">
              <span data-stage-group-counter="true">
                {groupIndex + 1} / {deck.groups.length}
              </span>
              <span data-stage-frame-counter="true">
                {groupIndex + 1}-{frameIndex + 1}
              </span>
            </div>
          </div>

          <div className="stage-shell__controls">
            <button type="button" className="stage-shell__control" onClick={() => moveToGroup(0)}>
              |&lt;
            </button>
            <button type="button" className="stage-shell__control" onClick={() => moveToGroup(groupIndex - 1)}>
              &lt;
            </button>
            <button type="button" className="stage-shell__control" onClick={advance}>
              &gt;
            </button>
            <button type="button" className="stage-shell__control" onClick={() => moveToGroup(deck.groups.length - 1)}>
              &gt;|
            </button>
            <button type="button" className="stage-shell__control" onClick={() => void onToggleFullscreen()}>
              {isFullscreen ? 'Exit' : 'Full'}
            </button>
          </div>

          <div className="stage-shell__frame-dots" aria-label="Stage frames">
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
        </div>
      </div>
    </main>
  );
}
