import {describe, expect, it} from 'vitest';

import type {NormalizedDoc} from '../core/content';

import {deriveDocumentInsights} from './document-insights';

const sampleDoc: NormalizedDoc = {
  filePath: 'C:/vault/notes/sample.md',
  relativePath: 'notes/sample.md',
  sourceRoot: 'C:/vault',
  sourceDir: 'C:/vault/notes',
  slug: 'sample',
  baseDepth: 2,
  headings: [
    {
      text: '첫 번째 섹션',
      slug: 'section-1',
      depth: 2,
      level: 1,
    },
  ],
  warnings: [],
  meta: {
    title: '샘플 문서',
    docType: 'note',
    outputs: ['reader', 'newsletter'],
    theme: 'auto',
    author: 'ACH',
    date: '2026-04-04',
    tags: ['pkm', 'obsidian'],
    summary: '문제는 앱이 아니라, 지식의 원본 포맷을 누가 통제하느냐에 있다.',
    heroLabel: '',
    toc: 'auto',
    tocMaxDepth: 'auto',
    tocTitle: 'Table of Contents',
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
  sections: [
    {
      id: 'lead',
      title: 'Lead',
      depth: 2,
      blocks: [
        {
          kind: 'prose',
          html: '<p>첫 문단이다.</p><p><a href="https://example.com/a">첫 소스</a>를 참고했다.</p>',
        },
        {
          kind: 'thesis',
          content: '<p>진짜 질문은 앱을 쓰느냐가 아니라, 문서를 누가 설계하느냐이다.</p>',
        },
        {
          kind: 'callout',
          calloutType: 'summary',
          title: '요약',
          content: '<p><a href="https://example.com/b">두 번째 소스</a>도 중요하다.</p>',
        },
      ],
    },
  ],
};

describe('deriveDocumentInsights', () => {
  it('derives thesis, key line, kicker, and source links from a normalized document', () => {
    const insights = deriveDocumentInsights(sampleDoc);

    expect(insights.thesis).toBe(sampleDoc.meta.summary);
    expect(insights.keyLine).toContain('진짜 질문은 앱을 쓰느냐가 아니라');
    expect(insights.standfirst).toBe(sampleDoc.meta.summary);
    expect(insights.kicker).toBe('Long-form note & newsletter draft');
    expect(insights.metaTrail).toEqual(['ACHMAGE', 'THESIS-FIRST DOCUMENT', '2026-04-04']);
    expect(insights.sources).toEqual([
      {href: 'https://example.com/a', label: '첫 소스'},
      {href: 'https://example.com/b', label: '두 번째 소스'},
    ]);
  });
});

