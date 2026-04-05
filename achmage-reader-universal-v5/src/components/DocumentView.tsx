import {useEffect, useState} from 'react';

import {findActiveHeadingId, getActiveHeadingLine, type NormalizedDoc, type OutputMode} from '../core/content';
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
    const headingIds = Array.from(
      new Set(
        tocLinks
          .map((link) => link.getAttribute('data-toc-item'))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const headings = headingIds
      .map((id) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);

    if (tocLinks.length === 0 || headings.length === 0) {
      return;
    }

    let activeId = '';
    let frame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resourceListeners: Array<{element: HTMLElement; handler: () => void}> = [];

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
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
    };

    const revealActiveLinks = (id: string) => {
      tocLinks.forEach((link) => {
        if (link.getAttribute('data-toc-item') === id) {
          revealLinkInScrollRoot(link);
        }
      });
    };

    const activate = (id: string) => {
      const changed = activeId !== id;
      activeId = id;

      if (changed) {
        tocLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('data-toc-item') === id);
        });
      }

      revealActiveLinks(id);
    };

    const syncActiveHeading = () => {
      frame = 0;

      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);
      const activationLine = getActiveHeadingLine({
        viewportHeight,
        scrollTop,
        maxScroll,
      });
      const nextActiveId = findActiveHeadingId(
        headings.map((heading) => ({
          id: heading.id,
          top: heading.getBoundingClientRect().top,
        })),
        activationLine,
      );

      if (nextActiveId) {
        activate(nextActiveId);
      }
    };

    const requestSync = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(syncActiveHeading);
    };

    const onRevealActive = () => {
      if (activeId) {
        revealActiveLinks(activeId);
        return;
      }

      requestSync();
    };

    article?.querySelectorAll<HTMLElement>('img, iframe, video').forEach((element) => {
      const handler = () => {
        requestSync();
      };
      element.addEventListener('load', handler, {passive: true});
      resourceListeners.push({element, handler});
    });

    requestSync();

    window.addEventListener('scroll', requestSync, {passive: true});
    window.addEventListener('resize', requestSync);
    window.addEventListener('hashchange', requestSync);
    window.addEventListener('load', requestSync);
    window.addEventListener('toc:reveal-active', onRevealActive);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      window.removeEventListener('hashchange', requestSync);
      window.removeEventListener('load', requestSync);
      window.removeEventListener('toc:reveal-active', onRevealActive);
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
                  if (target?.closest('a[data-toc-link]')) {
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
