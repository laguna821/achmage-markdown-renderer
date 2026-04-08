// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {normalizeVaultSnapshot, type VaultSnapshot} from '../core/content';
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
  it('navigates internal note links when the click target is the text node itself', () => {
    const {onDocRoute} = bindArticleDelegation({
      html: '<div class="prose-block"><p><a href="?view=reader&doc=target-note">텍스트 링크</a></p></div>',
    });

    const anchor = document.querySelector('a[href="?view=reader&doc=target-note"]');
    const textNode = anchor?.firstChild;
    if (!(anchor instanceof HTMLAnchorElement) || !(textNode instanceof Text)) {
      throw new Error('text-node anchor not found');
    }

    textNode.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onDocRoute).toHaveBeenCalledWith('reader', 'target-note', undefined);
  });

  it('ignores modifier, middle-click, and download link cases', () => {
    const {onDocRoute, article} = bindArticleDelegation({
      html: [
        '<div class="prose-block">',
        '  <p><a href="?view=reader&doc=target-note" data-link="modifier">Modifier</a></p>',
        '  <p><a href="?view=reader&doc=target-note" data-link="middle">Middle</a></p>',
        '  <p><a href="?view=reader&doc=target-note" data-link="download" download>Download</a></p>',
        '</div>',
      ].join(''),
    });

    const modifierLink = article.querySelector('a[data-link="modifier"]');
    const middleLink = article.querySelector('a[data-link="middle"]');
    const downloadLink = article.querySelector('a[data-link="download"]');
    if (!(modifierLink instanceof HTMLAnchorElement) || !(middleLink instanceof HTMLAnchorElement) || !(downloadLink instanceof HTMLAnchorElement)) {
      throw new Error('expected anchors were not found');
    }

    modifierLink.addEventListener('click', (event) => event.preventDefault());
    middleLink.addEventListener('click', (event) => event.preventDefault());
    downloadLink.addEventListener('click', (event) => event.preventDefault());

    modifierLink.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true, ctrlKey: true}));
    middleLink.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true, button: 1}));
    downloadLink.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onDocRoute).not.toHaveBeenCalled();
  });

  it('navigates a Korean wiki link rendered from normalized markdown', () => {
    const snapshot: VaultSnapshot = {
      state: {
        rootPath: 'C:/vault',
        docCount: 2,
        lastIndexedAt: '2',
        watchStatus: 'sample',
        signature: 'sig-korean-dom',
      },
      files: [
        {
          filePath: 'C:/vault/notes/current.md',
          relativePath: 'notes/current.md',
          size: 1,
          mtimeMs: 1,
          content: `---
title: Current note
docType: note
outputs: [reader]
---

## Overview

[[옵시디언 문법 뭐에요]]
`,
        },
        {
          filePath: 'C:/vault/notes/obsidian-guide.md',
          relativePath: 'notes/obsidian-guide.md',
          size: 1,
          mtimeMs: 2,
          content: `---
title: 옵시디언 문법 뭐에요
slug: opsidian-guide
docType: note
outputs: [reader]
---

## Overview

대상 노트 본문
`,
        },
      ],
    };
    const {normalizedDocuments} = normalizeVaultSnapshot(snapshot);
    const currentDoc = normalizedDocuments.find((document) => document.slug === 'notes-current');
    const proseBlock = currentDoc?.sections[0]?.blocks.find((block) => block.kind === 'prose');
    if (!proseBlock || proseBlock.kind !== 'prose') {
      throw new Error('prose block not found');
    }

    const {onDocRoute} = bindArticleDelegation({
      html: `<div class="prose-block">${proseBlock.html}</div>`,
    });

    const anchor = document.querySelector('a[href="?view=reader&doc=opsidian-guide"]');
    const textNode = anchor?.firstChild;
    if (!(anchor instanceof HTMLAnchorElement) || !(textNode instanceof Text)) {
      throw new Error('rendered Korean wiki link not found');
    }

    textNode.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true}));

    expect(onDocRoute).toHaveBeenCalledWith('reader', 'opsidian-guide', undefined);
  });
});
