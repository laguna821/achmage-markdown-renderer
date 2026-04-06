import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {BlockRenderer} from './BlockRenderer';
import type {NormalizedDoc} from '../core/content';

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

describe('BlockRenderer', () => {
  it('renders thesis blocks with native anchors instead of the manual rich overlay', () => {
    const markup = renderToStaticMarkup(
      <BlockRenderer
        block={{
          kind: 'thesis',
          content:
            '<p><a href="?view=reader&doc=%EB%A7%88%ED%81%AC%EB%8B%A4%EC%9A%B4%20%EB%A7%81%ED%81%AC%20%EB%85%B8%ED%8A%B8%20%EC%98%88%EC%8B%9C">마크다운 링크 노트 예시</a></p><p>두 번째 문단</p>',
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
});
