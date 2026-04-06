// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {handleArticleLinkClick} from './document-links';

const CURRENT_HREF = 'https://tauri.localhost/?view=reader&doc=current-note';

const bindArticleDelegation = ({
  html,
  onDocRoute = vi.fn(),
  onHash = vi.fn(),
  onExternal = vi.fn(),
}: {
  html: string;
  onDocRoute?: ReturnType<typeof vi.fn>;
  onHash?: ReturnType<typeof vi.fn>;
  onExternal?: ReturnType<typeof vi.fn>;
}) => {
  document.body.innerHTML = `<article class="doc-article">${html}</article><div id="target-heading"></div>`;
  const article = document.querySelector<HTMLElement>('.doc-article');
  if (!article) {
    throw new Error('article not found');
  }

  article.addEventListener(
    'click',
    (event) => {
      handleArticleLinkClick({
        event: event as MouseEvent,
        currentHref: CURRENT_HREF,
        onDocRoute,
        onHash,
        onExternal,
      });
    },
    true,
  );

  return {article, onDocRoute, onHash, onExternal};
};

describe('native article link delegation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('navigates internal note links inside prose HTML', () => {
    const {onDocRoute} = bindArticleDelegation({
      html: '<div class="prose-block"><p><a href="?view=reader&doc=target-note"><strong>Target note</strong></a></p></div>',
    });

    const target = document.querySelector('strong');
    if (!(target instanceof HTMLElement)) {
      throw new Error('strong not found');
    }

    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onDocRoute).toHaveBeenCalledWith('reader', 'target-note', undefined);
  });

  it('navigates internal note links inside thesis HTML', () => {
    const {onDocRoute} = bindArticleDelegation({
      html: '<aside class="thesis-block"><div class="thesis-block__content prose-block"><p><a href="?view=reader&doc=wikilink-note">[[wikilink]]</a></p></div></aside>',
    });

    const target = document.querySelector('.thesis-block__content a');
    if (!(target instanceof HTMLElement)) {
      throw new Error('thesis anchor not found');
    }

    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onDocRoute).toHaveBeenCalledWith('reader', 'wikilink-note', undefined);
  });

  it('opens external links inside callout HTML', () => {
    const {onExternal} = bindArticleDelegation({
      html: '<aside class="callout-block"><div class="callout-block__body prose-block"><p><a href="https://example.com"><code>external</code></a></p></div></aside>',
    });

    const target = document.querySelector('code');
    if (!(target instanceof HTMLElement)) {
      throw new Error('code target not found');
    }

    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('routes hash links with the clicked anchor for ToC-aware scrolling', () => {
    const {onHash} = bindArticleDelegation({
      html: '<div class="doc-quote__content prose-block"><p><a href="#target-heading">Jump</a></p></div>',
    });

    const target = document.querySelector('a[href="#target-heading"]');
    if (!(target instanceof HTMLAnchorElement)) {
      throw new Error('hash anchor not found');
    }

    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onHash).toHaveBeenCalledOnce();
    expect(onHash.mock.calls[0]?.[0]).toBe('target-heading');
    expect(onHash.mock.calls[0]?.[1]).toBe(target);
  });
});
