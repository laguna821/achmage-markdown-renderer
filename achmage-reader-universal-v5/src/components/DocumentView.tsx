import {useEffect, useState} from 'react';

import {findActiveHeadingId, type NormalizedDoc, type OutputMode, type TocItem} from '../core/content';
import {initPretextEnhancer} from '../core/pretext/client';
import {openExternal} from '../lib/bridge';

import {DocRail} from './DocRail';
import {DocumentHeader} from './DocumentHeader';
import {DocumentSections} from './DocumentSections';
import {TocList} from './TocList';

type DocumentViewProps = {
  doc: NormalizedDoc;
  output: OutputMode;
  onNavigateDoc: (output: OutputMode, slug: string, anchor?: string) => void;
};

const isDocRouteHref = (href: string): boolean => href.startsWith('?view=');
const flattenTocItems = (items: TocItem[]): TocItem[] =>
  items.flatMap((item) => [item, ...(item.children ? flattenTocItems(item.children) : [])]);

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
      target.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }, [doc.slug, output]);

  useEffect(() => {
    const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-item]'));
    const article = document.querySelector<HTMLElement>('.doc-article');
    const tocItemIdSet = new Set(flattenTocItems(doc.headings).map((item) => item.slug));
    const headings = article
      ? Array.from(article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')).filter((heading) =>
          tocItemIdSet.has(heading.id),
        )
      : [];

    if (tocLinks.length === 0 || headings.length === 0) {
      return;
    }

    const tocLinksById = tocLinks.reduce<Map<string, HTMLAnchorElement[]>>((map, link) => {
      const id = link.getAttribute('data-toc-item');
      if (!id) {
        return map;
      }

      const entries = map.get(id);
      if (entries) {
        entries.push(link);
      } else {
        map.set(id, [link]);
      }

      return map;
    }, new Map());

    let activeId = '';
    let syncFrame = 0;
    let refreshFrame = 0;
    let settleTimer = 0;
    let measuredHeadings = headings.map((heading) => ({id: heading.id, top: 0}));
    const resourceListeners: Array<{element: HTMLElement; handler: () => void}> = [];
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    const headingOrder = new Map(headings.map((heading, index) => [heading.id, index]));
    const intersectionState = new Map<string, {top: number; isIntersecting: boolean}>();

    const getScrollElement = () => document.scrollingElement ?? document.documentElement;
    const getScrollTop = () =>
      window.scrollY ??
      window.pageYOffset ??
      document.documentElement.scrollTop ??
      document.body.scrollTop ??
      getScrollElement().scrollTop;
    const getViewportHeight = () => window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
    const getSiteHeaderHeight = () => document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().height ?? 0;

    const measureHeadings = () => {
      const scrollTop = getScrollTop();
      measuredHeadings = headings.map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top + scrollTop,
      }));
    };

    const revealLinkInScrollRoot = (link: HTMLAnchorElement) => {
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

      scrollRoot.scrollTo({
        top: nextTop,
        behavior: 'auto',
      });
    };

    const revealActiveLinks = (id: string) => {
      tocLinksById.get(id)?.forEach((link) => revealLinkInScrollRoot(link));
    };

    const activate = (id: string) => {
      if (activeId === id) {
        return;
      }

      activeId = id;
      tocLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('data-toc-item') === id);
      });
      revealActiveLinks(id);
    };

    const syncFromMeasuredPositions = () => {
      measureHeadings();
      const scrollElement = getScrollElement();
      const scrollTop = getScrollTop();
      const activationTop = scrollTop + getSiteHeaderHeight() + 24;
      const maxScroll = Math.max(scrollElement.scrollHeight - getViewportHeight(), 0);
      const nextActiveId =
        scrollTop >= maxScroll - 2
          ? (headings[headings.length - 1]?.id ?? null)
          : findActiveHeadingId(measuredHeadings, activationTop);

      if (nextActiveId) {
        activate(nextActiveId);
      }
    };

    const syncFromIntersections = () => {
      const visibleEntries = Array.from(intersectionState.entries())
        .filter(([, state]) => state.isIntersecting)
        .sort((left, right) => {
          const leftOrder = headingOrder.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = headingOrder.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder === rightOrder) {
            return left[1].top - right[1].top;
          }
          return leftOrder - rightOrder;
        });

      const nextActiveId = visibleEntries[0]?.[0] ?? null;
      if (!nextActiveId) {
        return;
      }

      activate(nextActiveId);
    };

    const flushIntersectionSync = () => {
      syncFrame = 0;
      syncFromIntersections();
    };

    const requestIntersectionSync = () => {
      if (syncFrame !== 0) {
        return;
      }

      syncFrame = window.requestAnimationFrame(flushIntersectionSync);
    };

    const scheduleFallbackSync = () => {
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }

      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        syncFromMeasuredPositions();
      }, 96);
    };

    const rebuildIntersectionObserver = () => {
      measureHeadings();
      intersectionState.clear();
      intersectionObserver?.disconnect();

      if (typeof IntersectionObserver === 'undefined') {
        syncFromMeasuredPositions();
        return;
      }

      const bandTop = Math.max(Math.round(getSiteHeaderHeight() + 24), 1);
      const bandBottom = Math.max(getViewportHeight() - bandTop - 2, 1);
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const heading = entry.target as HTMLElement;
            intersectionState.set(heading.id, {
              top: heading.getBoundingClientRect().top + getScrollTop(),
              isIntersecting: entry.isIntersecting,
            });
          });

          requestIntersectionSync();
        },
        {
          root: null,
          threshold: 0,
          rootMargin: `-${bandTop}px 0px -${bandBottom}px 0px`,
        },
      );

      headings.forEach((heading, index) => {
        intersectionState.set(heading.id, {
          top: measuredHeadings[index]?.top ?? 0,
          isIntersecting: false,
        });
        intersectionObserver?.observe(heading);
      });

      syncFromMeasuredPositions();
    };

    const requestObserverRefresh = () => {
      if (refreshFrame !== 0) {
        return;
      }

      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = 0;
        rebuildIntersectionObserver();
      });
    };

    requestObserverRefresh();

    if (typeof ResizeObserver !== 'undefined' && article) {
      resizeObserver = new ResizeObserver(() => {
        requestObserverRefresh();
      });
      resizeObserver.observe(article);
      headings.forEach((heading) => resizeObserver?.observe(heading));
    }

    if (typeof MutationObserver !== 'undefined' && article) {
      mutationObserver = new MutationObserver(() => {
        requestObserverRefresh();
      });
      mutationObserver.observe(article, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'open', 'hidden'],
      });
    }

    article?.querySelectorAll<HTMLElement>('img, iframe, video').forEach((element) => {
      const handler = () => {
        requestObserverRefresh();
      };
      element.addEventListener('load', handler, {passive: true});
      resourceListeners.push({element, handler});
    });

    const onScroll = () => {
      const scrollElement = getScrollElement();
      const scrollTop = getScrollTop();
      const maxScroll = Math.max(scrollElement.scrollHeight - getViewportHeight(), 0);

      if (scrollTop >= maxScroll - 2) {
        const lastHeadingId = headings[headings.length - 1]?.id;
        if (lastHeadingId) {
          activate(lastHeadingId);
        }
      }

      scheduleFallbackSync();
    };
    const onResize = () => {
      requestObserverRefresh();
    };
    const onHashChange = () => {
      requestObserverRefresh();
    };
    const onLoad = () => {
      requestObserverRefresh();
    };

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('load', onLoad);

    return () => {
      if (syncFrame !== 0) {
        window.cancelAnimationFrame(syncFrame);
      }
      if (refreshFrame !== 0) {
        window.cancelAnimationFrame(refreshFrame);
      }
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      intersectionObserver?.disconnect();
      resourceListeners.forEach(({element, handler}) => {
        element.removeEventListener('load', handler);
      });
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('load', onLoad);
    };
  }, [doc.headings, doc.slug]);

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
              <div className="mobile-toc__panel" data-mobile-toc-panel data-toc-scroll-root="mobile" hidden={!mobileTocOpen}>
                <div className="mobile-toc__header">
                  <span>{doc.meta.tocTitle}</span>
                  <button type="button" data-mobile-toc-close onClick={() => setMobileTocOpen(false)}>
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
