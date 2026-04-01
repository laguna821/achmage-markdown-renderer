import {describe, expect, test} from 'vitest';

import {
  buildHomeSearchEntries,
  normalizeHomeSearchQuery,
  parseHomeSearchExpression,
  parseHomeSearchState,
  searchHomeEntries,
  serializeHomeSearchState,
  stripMarkdownToPlainText,
} from '../src/lib/content/home-search';
import {parseSourceFile} from '../src/lib/content/source';

describe('home search index', () => {
  test('builds entries with flattened YAML, plain text body, and inline hashtags', () => {
    const document = parseSourceFile({
      filePath: 'C:/virtual/home-search-entry.md',
      sourceRoot: 'C:/virtual',
      raw: `---
title: "Sample Search Doc"
docType: "note"
outputs: ["reader"]
tags:
  - search-alpha
course:
  track: "AI literacy"
  cohort: 7
summary: "Summary line"
---

# Heading

Body text explains **AI literacy** in context. #inline-tag

\`\`\`ts
const topic = "AI literacy";
\`\`\`
`,
    });

    const [entry] = buildHomeSearchEntries([document]);

    expect(entry.frontmatterText).toContain('AI literacy');
    expect(entry.frontmatterTags).toEqual(['search-alpha']);
    expect(entry.inlineTags).toContain('inline-tag');
    expect(entry.plainBody).toContain('Body text explains AI literacy in context. #inline-tag');
    expect(entry.plainBody).toContain('const topic = "AI literacy";');
  });

  test('strips markdown and obsidian syntax into searchable plain text', () => {
    const plain = stripMarkdownToPlainText(
      `> [!NOTE] Callout Title
> body line

![Alt text](https://example.com/demo.png)

[[Linked Note|Mapped Label]]

\`\`\`js
console.log('hello');
\`\`\`
`,
    );

    expect(plain).toContain('Callout Title');
    expect(plain).toContain('body line');
    expect(plain).toContain('Alt text');
    expect(plain).toContain('Mapped Label');
    expect(plain).toContain("console.log('hello');");
  });
});

describe('home search parser', () => {
  test('parses AND/OR expressions and tag tokens', () => {
    const parsed = parseHomeSearchExpression('AI literacy AND #meta OR "workflow engineering"');

    expect(parsed.clauses).toHaveLength(2);
    expect(parsed.clauses[0]?.terms.map((term) => `${term.kind}:${term.normalized}`)).toEqual([
      'text:ai',
      'text:literacy',
      'tag:meta',
    ]);
    expect(parsed.clauses[1]?.terms.map((term) => `${term.kind}:${term.normalized}`)).toEqual([
      'text:workflow engineering',
    ]);
    expect(parsed.hasAnd).toBe(true);
    expect(parsed.hasOr).toBe(true);
  });
});

describe('home search matching', () => {
  const entries = [
    {
      slug: 'title-hit',
      title: 'AI literacy title document',
      docType: 'note',
      date: undefined,
      outputs: ['reader'],
      summary: 'Summary',
      frontmatterText: 'topic alpha',
      frontmatterTags: ['alpha'],
      inlineTags: [],
      plainBody: 'Body helper text',
      originalOrder: 0,
    },
    {
      slug: 'yaml-hit',
      title: 'YAML document',
      docType: 'note',
      date: undefined,
      outputs: ['reader'],
      summary: 'Summary',
      frontmatterText: 'AI literacy yaml field',
      frontmatterTags: ['beta'],
      inlineTags: [],
      plainBody: 'Body helper text',
      originalOrder: 1,
    },
    {
      slug: 'body-hit',
      title: 'Body document',
      docType: 'note',
      date: undefined,
      outputs: ['reader'],
      summary: undefined,
      frontmatterText: 'misc',
      frontmatterTags: ['alpha'],
      inlineTags: ['beta-inline'],
      plainBody: 'This body contains AI literacy and beta-inline signals.',
      originalOrder: 2,
    },
    {
      slug: 'control',
      title: 'Control document',
      docType: 'note',
      date: undefined,
      outputs: ['reader'],
      summary: undefined,
      frontmatterText: 'misc',
      frontmatterTags: ['gamma'],
      inlineTags: [],
      plainBody: 'Totally unrelated content.',
      originalOrder: 3,
    },
  ] as const;

  test('prefers title phrase matches and keeps stable original order on ties', () => {
    const results = searchHomeEntries(entries, {
      query: 'AI literacy',
      tags: [],
    });

    expect(results.map((result) => result.entry.slug)).toEqual(['title-hit', 'yaml-hit', 'body-hit']);
    expect(results[0]?.matchedFields).toContain('title');
    expect(results[1]?.matchedFields).toContain('yaml');
    expect(results[2]?.matchedFields).toContain('body');
  });

  test('supports explicit AND with inline tag syntax', () => {
    const results = searchHomeEntries(entries, {
      query: 'AI AND #alpha',
      tags: [],
    });

    expect(results.map((result) => result.entry.slug)).toEqual(['title-hit', 'body-hit']);
  });

  test('supports explicit OR groups', () => {
    const results = searchHomeEntries(entries, {
      query: '#alpha OR #gamma',
      tags: [],
    });

    expect(results.map((result) => result.entry.slug)).toEqual(['title-hit', 'body-hit', 'control']);
  });

  test('preserves legacy tags as an AND filter for older URLs', () => {
    const results = searchHomeEntries(entries, {
      query: 'AI',
      tags: ['alpha'],
    });

    expect(results.map((result) => result.entry.slug)).toEqual(['title-hit', 'body-hit']);
  });

  test('restores original order when query is empty', () => {
    const results = searchHomeEntries(entries, {
      query: '   ',
      tags: [],
    });

    expect(results.map((result) => result.entry.slug)).toEqual(['title-hit', 'yaml-hit', 'body-hit', 'control']);
  });
});

describe('home search URL state', () => {
  test('normalizes query and round-trips q/tags', () => {
    expect(normalizeHomeSearchQuery('  AI   literacy  ')).toBe('ai literacy');

    const serialized = serializeHomeSearchState({
      query: 'AI literacy AND #alpha',
      tags: ['beta', 'alpha'],
    });

    expect(serialized).toBe('?q=AI+literacy+AND+%23alpha&tags=alpha%2Cbeta');
    expect(parseHomeSearchState(serialized)).toEqual({
      query: 'AI literacy AND #alpha',
      tags: ['alpha', 'beta'],
    });
  });
});
