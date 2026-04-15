// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {NormalizedDoc} from '../core/content';

import {BlockRenderer} from './BlockRenderer';

const baseDoc: NormalizedDoc = {
  filePath: 'C:/vault/example.md',
  relativePath: 'example.md',
  sourceRoot: 'C:/vault',
  sourceDir: 'C:/vault',
  slug: 'example',
  meta: {
    title: 'Example',
    docType: 'note',
    outputs: ['reader'],
    theme: 'dark',
    tags: [],
    toc: 'auto',
    tocMaxDepth: 'auto',
    tocTitle: 'Index',
    stage: {
      enabled: false,
      focusMode: false,
      keyboardNav: false,
      revealLists: false,
    },
    rail: {
      showMetadata: true,
      showTags: true,
      showToc: true,
    },
  },
  baseDepth: null,
  headings: [],
  sections: [],
  warnings: [],
};

const mountBlock = async (block: Parameters<typeof BlockRenderer>[0]['block']) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<BlockRenderer block={block} variant="stage" doc={baseDoc} sectionId="section-1" blockIndex={0} />);
    await Promise.resolve();
  });

  return {container, root};
};

describe('BlockRenderer', () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });

  afterEach(async () => {
    if (root) {
      const mountedRoot = root;
      await act(async () => {
        mountedRoot.unmount();
      });
      root = null;
    }
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renders thesis blocks with native anchors instead of the manual rich overlay', () => {
    const markup = renderToStaticMarkup(
      <BlockRenderer
        block={{
          kind: 'thesis',
          content:
            '<p><a href="?view=reader&doc=%EB%A7%88%ED%81%AC%EB%8B%A4%EC%9A%B4%20%EB%A7%81%ED%81%AC%20%EB%85%B8%ED%8A%B8%20%EC%98%88%EC%8B%9C">留덊겕?ㅼ슫 留곹겕 ?명듃 ?덉떆</a></p><p>??踰덉㎏ 臾몃떒</p>',
          rich: {
            plainText: 'ignored',
            tokens: [{kind: 'text', value: 'ignored'}],
          },
        }}
        variant="reader"
        doc={baseDoc}
        sectionId="section-1"
        blockIndex={0}
      />,
    );

    expect(markup).toContain('class="thesis-block__content prose-block"');
    expect(markup).toContain('<a href="?view=reader&doc=%EB%A7%88%ED%81%AC%EB%8B%A4%EC%9A%B4%20%EB%A7%81%ED%81%AC%20%EB%85%B8%ED%8A%B8%20%EC%98%88%EC%8B%9C">');
    expect(markup).not.toContain('pretext-rich-shell');
    expect(markup).not.toContain('data-pretext-rich-source');
    expect(markup).not.toContain('data-pretext-rich-overlay');
  });

  it('renders doc quotes with native anchors instead of the manual rich overlay', () => {
    const markup = renderToStaticMarkup(
      <BlockRenderer
        block={{
          kind: 'docQuote',
          content: '<p><a href="https://example.com">external</a></p><p>quoted</p>',
          rich: {
            plainText: 'ignored',
            tokens: [{kind: 'text', value: 'ignored'}],
          },
        }}
        variant="reader"
        doc={baseDoc}
        sectionId="section-2"
        blockIndex={1}
      />,
    );

    expect(markup).toContain('class="doc-quote__content prose-block"');
    expect(markup).toContain('<a href="https://example.com">external</a>');
    expect(markup).not.toContain('pretext-rich-shell');
    expect(markup).not.toContain('data-pretext-rich-source');
    expect(markup).not.toContain('data-pretext-rich-overlay');
  });

  it('wraps stage images in a contain viewport and marks runtime image shape', async () => {
    const cases = [
      {shape: 'landscape', width: 1600, height: 900},
      {shape: 'portrait', width: 900, height: 1600},
      {shape: 'square', width: 1200, height: 1200},
    ] as const;

    for (const imageCase of cases) {
      if (root) {
        const mountedRoot = root;
        await act(async () => {
          mountedRoot.unmount();
        });
        root = null;
      }

      const mounted = await mountBlock({
        kind: 'image',
        src: `/assets/${imageCase.shape}.png`,
        alt: `${imageCase.shape} screenshot`,
        caption: 'Stage image caption',
      });
      root = mounted.root;

      const figure = mounted.container.querySelector<HTMLElement>('.image-block--stage');
      const viewport = mounted.container.querySelector<HTMLElement>('.image-block__stage-viewport');
      const image = mounted.container.querySelector<HTMLImageElement>('.image-block--stage img');
      const caption = mounted.container.querySelector('figcaption');

      if (!figure || !viewport || !image || !caption) {
        throw new Error('stage image elements not found');
      }

      Object.defineProperty(image, 'naturalWidth', {
        configurable: true,
        value: imageCase.width,
      });
      Object.defineProperty(image, 'naturalHeight', {
        configurable: true,
        value: imageCase.height,
      });

      await act(async () => {
        image.dispatchEvent(new Event('load'));
        await Promise.resolve();
      });

      expect(figure.dataset.stageImageShape).toBe(imageCase.shape);
      expect(viewport.dataset.stageImageViewport).toBe('true');
      expect(caption.textContent).toContain('Stage image caption');
    }
  });

  it('adds stage-specific hooks for solo card block kinds', () => {
    const calloutMarkup = renderToStaticMarkup(
      <BlockRenderer
        block={{kind: 'callout', calloutType: 'summary', title: '3줄 요약', content: '<p>짧은 요약.</p>'}}
        variant="stage"
        doc={baseDoc}
        sectionId="section-1"
        blockIndex={0}
      />,
    );
    const quoteMarkup = renderToStaticMarkup(
      <BlockRenderer
        block={{kind: 'docQuote', content: '<p>짧은 인용문.</p>'}}
        variant="stage"
        doc={baseDoc}
        sectionId="section-2"
        blockIndex={0}
      />,
    );

    expect(calloutMarkup).toContain('callout-block--stage');
    expect(calloutMarkup).toContain('data-stage-block-kind="callout"');
    expect(quoteMarkup).toContain('doc-quote--stage');
    expect(quoteMarkup).toContain('data-stage-block-kind="docQuote"');
  });
});
