import {useEffect, useState} from 'react';

import {findActiveHeadingId, getActiveHeadingLine, type NormalizedDoc, type OutputMode} from '../core/content';
import {initPretextEnhancer} from '../core/pretext/client';
import {openExternal} from '../lib/bridge';

import {
  buildLiveHeadingSnapshot,
  flattenTocIds,
  resolveVisibleHeadingIndex,
  type TocDebugHeading,
  type TocSyncTrigger,
} from './document-toc-sync';
import {DocRail} from './DocRail';
import {DocumentHeader} from './DocumentHeader';
import {DocumentSections} from './DocumentSections';
import {TocList} from './TocList';

type DocumentViewProps = {
  doc: NormalizedDoc;
  output: OutputMode;
  onNavigateDoc: (output: OutputMode, slug: string, anchor?: string) => void;
};

declare global {
  interface Window {
    __ACHMAGE_TOC_DEBUG__?: {
      activeLine: number;
      absoluteTargetId: string | null;
      visibleActiveId: string | null;
      currentIndex: number;
      targetIndex: number;
      trigger: TocSyncTrigger;
      headings: TocDebugHeading[];
    };
  }
}

const isDocRouteHref = (href: string): boolean => href.startsWith('?view=');
const SCROLL_BURST_IDLE_MS = 140;
const ANCHOR_SCROLL_GAP = 16;

const isScrollNavigationKey = (event: KeyboardEvent): boolean => {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const target = event.target as HTMLElement | null;
  if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
    return false;
  }

  return ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(event.key);
};

const getStickyHeaderOffset = (): number => {
  const header = document.querySelector<HTMLElement>('.site-header');
  return header ? header.getBoundingClientRect().height : 0;
};

const scrollElementIntoViewWithOffset = (
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): void => {
  const top = Math.max(window.scrollY + element.getBoundingClientRect().top - getStickyHeaderOffset() - ANCHOR_SCROLL_GAP, 0);
  window.scrollTo({top, behavior});
};

export function DocumentView({doc, output, onNavigateDoc}: DocumentViewProps) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    if (output === 'reader' || output === 'stage' || output === 'newsletter') {
      initPretextEnhancer(output);
    }
  }, [doc.slug, output]);

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({top: 0, behavior: 'auto'});
      return;
    }

    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(anchorId);
    if (target) {
      scrollElementIntoViewWithOffset(target, 'auto');
    }
  }, [doc.slug, output]);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('.doc-article');
    const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-item]'));
    const tocHeadingIds = new Set(flattenTocIds(doc.headings));
    const articleHeadings = article
      ? Array.from(article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
      : [];

    if (!article || tocLinks.length === 0 || articleHeadings.length === 0 || tocHeadingIds.size === 0) {
      return;
    }

    let activeId = '';
    let activeIndex = -1;
    let frame = 0;
    let queuedTrigger: TocSyncTrigger = 'init';
    let queuedExplicitId: string | null = null;
    let pendingForcedReveal = true;
    let pendingAdvanceBudget = 0;
    let lastScrollTop = window.scrollY;
    let lastObservedScrollTop = window.scrollY;
    let scrollBurstActive = false;
    let scrollBurstTimer = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resourceListeners: Array<{element: HTMLElement; handler: () => void}> = [];

    const revealLinkInScrollRoot = (link: HTMLAnchorElement, force = false) => {
      const scrollRoot = link.closest('[data-toc-scroll-root]');
      if (!(scrollRoot instanceof HTMLElement)) {
        return;
      }

      if (
        scrollRoot.getClientRects().length === 0 ||
        link.getClientRects().length === 0 ||
        scrollRoot.scrollHeight <= scrollRoot.clientHeight
      ) {
        return;
      }

      const scrollRootRect = scrollRoot.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const padding = Math.min(40, scrollRoot.clientHeight * 0.14);
      const visibleTop = scrollRootRect.top + padding;
      const visibleBottom = scrollRootRect.bottom - padding;

      if (linkRect.top >= visibleTop && linkRect.bottom <= visibleBottom) {
        return;
      }

      const delta = linkRect.top < visibleTop ? linkRect.top - visibleTop : linkRect.bottom - visibleBottom;
      const maxScrollTop = Math.max(scrollRoot.scrollHeight - scrollRoot.clientHeight, 0);
      const nextTop = Math.min(Math.max(scrollRoot.scrollTop + delta, 0), maxScrollTop);
      const behavior =
        reducedMotion.matches || scrollRoot.getAttribute('data-toc-scroll-root') === 'desktop' || !force
          ? 'auto'
          : 'smooth';

      scrollRoot.scrollTo({
        top: nextTop,
        behavior,
      });
    };

    const revealActiveLinks = (id: string, force = false) => {
      tocLinks.forEach((link) => {
        if (link.getAttribute('data-toc-item') === id) {
          revealLinkInScrollRoot(link, force);
        }
      });
    };

    const activate = (id: string): boolean => {
      const changed = activeId !== id;
      activeId = id;

      if (changed) {
        tocLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('data-toc-item') === id);
        });
      }

      return changed;
    };

    const syncActiveHeading = () => {
      const trigger = queuedTrigger;
      const explicitId = queuedExplicitId;

      queuedTrigger = 'scroll';
      queuedExplicitId = null;
      frame = 0;

      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);
      const scrollChanged = scrollTop !== lastScrollTop;
      const scrollDirection = Math.sign(scrollTop - lastScrollTop);
      const activationLine = getActiveHeadingLine({
        viewportHeight,
        scrollTop,
        maxScroll,
      });
      const {candidates, debugHeadings} = buildLiveHeadingSnapshot(articleHeadings, tocHeadingIds);
      const absoluteTargetId = explicitId ?? findActiveHeadingId(candidates, activationLine);
      let currentIndex = activeIndex;
      if (activeId) {
        currentIndex = candidates.findIndex((heading) => heading.id === activeId);
      }
      if (currentIndex < 0 || currentIndex >= candidates.length) {
        currentIndex = -1;
      }
      const targetIndex = absoluteTargetId ? candidates.findIndex((heading) => heading.id === absoluteTargetId) : -1;
      const targetDirection =
        currentIndex < 0 || targetIndex < 0 || targetIndex === currentIndex ? 0 : Math.sign(targetIndex - currentIndex);
      const canAdvance =
        trigger === 'scroll' &&
        pendingAdvanceBudget > 0 &&
        scrollChanged &&
        (targetDirection === 0 || scrollDirection === 0 || targetDirection === scrollDirection);
      const nextVisibleIndex = resolveVisibleHeadingIndex({
        currentIndex,
        targetIndex,
        canAdvance,
        trigger,
      });
      const nextActiveId = nextVisibleIndex >= 0 ? candidates[nextVisibleIndex]?.id ?? null : null;

      if (import.meta.env.DEV) {
        window.__ACHMAGE_TOC_DEBUG__ = {
          activeLine: activationLine,
          absoluteTargetId: absoluteTargetId ?? null,
          visibleActiveId: nextActiveId,
          currentIndex,
          targetIndex,
          trigger,
          headings: debugHeadings,
        };
      }

      if (nextActiveId) {
        const changed = activate(nextActiveId);
        activeIndex = nextVisibleIndex;
        if (canAdvance && nextVisibleIndex !== currentIndex) {
          pendingAdvanceBudget = 0;
        }
        if (changed || pendingForcedReveal) {
          revealActiveLinks(nextActiveId, pendingForcedReveal);
        }
      } else {
        activeIndex = -1;
      }

      pendingForcedReveal = false;
      lastScrollTop = scrollTop;
    };

    const requestSync = (trigger: TocSyncTrigger = 'scroll', explicitId: string | null = null) => {
      if (trigger === 'toc-click' && explicitId) {
        queuedTrigger = trigger;
        queuedExplicitId = explicitId;
      } else if (queuedTrigger !== 'toc-click') {
        queuedTrigger = trigger;
      }

      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(syncActiveHeading);
    };

    const refreshScrollBurst = (grantBudget = false) => {
      if (grantBudget || !scrollBurstActive) {
        pendingAdvanceBudget = 1;
      }

      scrollBurstActive = true;

      if (scrollBurstTimer !== 0) {
        window.clearTimeout(scrollBurstTimer);
      }

      scrollBurstTimer = window.setTimeout(() => {
        scrollBurstActive = false;
        scrollBurstTimer = 0;
      }, SCROLL_BURST_IDLE_MS);
    };

    const onRevealActive = () => {
      if (activeId) {
        revealActiveLinks(activeId, true);
        return;
      }

      pendingForcedReveal = true;
      requestSync('reveal');
    };

    const onHashChange = () => {
      pendingForcedReveal = true;
      requestSync('hashchange');
    };

    const onLoad = () => {
      pendingForcedReveal = true;
      requestSync('load');
    };

    const onResize = () => {
      pendingForcedReveal = true;
      requestSync('resize');
    };

    const onScroll = () => {
      const nextScrollTop = window.scrollY;
      if (nextScrollTop !== lastObservedScrollTop) {
        refreshScrollBurst(!scrollBurstActive);
        lastObservedScrollTop = nextScrollTop;
      }
      requestSync('scroll');
    };

    const onScrollKeyDown = (event: KeyboardEvent) => {
      if (!isScrollNavigationKey(event)) {
        return;
      }

      refreshScrollBurst(true);
    };

    const onActivateTarget = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) {
        return;
      }

      requestSync('toc-click', id);
    };

    article?.querySelectorAll<HTMLElement>('img, iframe, video').forEach((element) => {
      const handler = () => {
        requestSync('resource');
      };
      element.addEventListener('load', handler, {passive: true});
      resourceListeners.push({element, handler});
    });

    requestSync('init');

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('load', onLoad);
    window.addEventListener('keydown', onScrollKeyDown);
    window.addEventListener('toc:reveal-active', onRevealActive);
    window.addEventListener('toc:activate-target', onActivateTarget as EventListener);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      if (scrollBurstTimer !== 0) {
        window.clearTimeout(scrollBurstTimer);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('keydown', onScrollKeyDown);
      window.removeEventListener('toc:reveal-active', onRevealActive);
      window.removeEventListener('toc:activate-target', onActivateTarget as EventListener);
      resourceListeners.forEach(({element, handler}) => {
        element.removeEventListener('load', handler);
      });
    };
  }, [doc.headings, doc.slug, output]);

  useEffect(() => {
    if (!mobileTocOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('toc:reveal-active'));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [mobileTocOpen]);

  useEffect(() => {
    if (output !== 'stage') {
      return;
    }

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-target="true"]'));
    if (sections.length === 0) {
      return;
    }

    let activeIndex = 0;

    const setActive = (nextIndex: number) => {
      activeIndex = Math.max(0, Math.min(nextIndex, sections.length - 1));
      sections.forEach((section, index) => {
        section.classList.toggle('is-active', index === activeIndex);
        section.classList.toggle('is-dimmed', index !== activeIndex);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];

        if (!visible) {
          return;
        }

        const nextIndex = sections.indexOf(visible.target as HTMLElement);
        if (nextIndex >= 0) {
          setActive(nextIndex);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 1],
      },
    );

    sections.forEach((section) => observer.observe(section));
    setActive(0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowRight', 'j', 'J', 'ArrowUp', 'ArrowLeft', 'k', 'K'].includes(event.key)) {
        return;
      }

      const direction =
        event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'j' || event.key === 'J' ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(activeIndex + direction, sections.length - 1));
      const nextSection = sections[nextIndex];
      if (!nextSection) {
        return;
      }

      event.preventDefault();
      setActive(nextIndex);
      nextSection.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [doc.slug, output]);

  const onClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a');
    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute('href') ?? '';
    if (!href) {
      return;
    }

    if (/^(https?:|mailto:)/i.test(href)) {
      event.preventDefault();
      void openExternal(href);
      return;
    }

    if (isDocRouteHref(href)) {
      event.preventDefault();
      const url = new URL(href, window.location.href);
      const nextOutput = url.searchParams.get('view');
      const nextSlug = url.searchParams.get('doc');
      const nextAnchor = url.hash ? url.hash.slice(1) : undefined;
      if (nextOutput === 'reader' || nextOutput === 'stage' || nextOutput === 'newsletter') {
        if (nextSlug) {
          onNavigateDoc(nextOutput, nextSlug, nextAnchor);
        }
      }
    }

    if (href.startsWith('#')) {
      const targetId = decodeURIComponent(href.slice(1));
      const targetElement = document.getElementById(targetId);
      if (!targetElement) {
        return;
      }

      event.preventDefault();
      scrollElementIntoViewWithOffset(targetElement, 'smooth');
      window.history.pushState(null, '', `#${encodeURIComponent(targetId)}`);

      if (anchor.matches('a[data-toc-item]')) {
        window.dispatchEvent(new CustomEvent<string>('toc:activate-target', {detail: targetId}));
      }
    }
  };

  return (
    <div onClickCapture={onClickCapture}>
      <div className={`layout-shell${output === 'stage' ? ' layout-shell--stage' : ''}${output === 'newsletter' ? ' layout-shell--newsletter' : ''}`}>
        <div className={`layout-shell__rail${output === 'newsletter' ? ' layout-shell__rail--newsletter' : ''}`}>
          <DocRail doc={doc} />
        </div>
        <main
          className={`layout-shell__main${output === 'newsletter' ? ' layout-shell__main--newsletter' : ''}`}
          data-pretext-stage-hero={output === 'stage' ? 'true' : undefined}
          data-pretext-max-viewport-ratio={output === 'stage' ? '0.92' : undefined}
          data-stage-fit={output === 'stage' ? 'stage-fit-ok' : undefined}
        >
          {doc.headings.length > 0 ? (
            <div className="mobile-toc">
              <button
                className="mobile-toc__trigger"
                type="button"
                data-mobile-toc-trigger
                aria-expanded={mobileTocOpen}
                onClick={() => setMobileTocOpen((current) => !current)}
              >
                Contents
              </button>
              <div
                className="mobile-toc__panel"
                data-mobile-toc-panel
                data-toc-scroll-root="mobile"
                hidden={!mobileTocOpen}
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (target?.closest('a[data-toc-item]')) {
                    setMobileTocOpen(false);
                  }
                }}
              >
                <div className="mobile-toc__header">
                  <span>{doc.meta.tocTitle}</span>
                  <button
                    type="button"
                    data-mobile-toc-close
                    aria-label="Close table of contents"
                    onClick={() => setMobileTocOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <TocList items={doc.headings} />
              </div>
            </div>
          ) : null}
          <div className={`doc-paper doc-paper--${output}`}>
            <DocumentHeader doc={doc} variant={output} />
            <DocumentSections doc={doc} variant={output} />
          </div>
        </main>
      </div>
    </div>
  );
}
