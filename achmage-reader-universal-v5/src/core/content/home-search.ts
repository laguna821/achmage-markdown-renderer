import type {DocType, OutputMode, SourceDocument} from './types';

export type HomeSearchEntry = {
  slug: string;
  title: string;
  docType: DocType;
  date?: string;
  outputs: readonly OutputMode[];
  summary?: string;
  frontmatterText: string;
  frontmatterTags: readonly string[];
  inlineTags: readonly string[];
  plainBody: string;
  originalOrder: number;
};

export type HomeSearchTagCount = {
  tag: string;
  count: number;
};

export type HomeSearchPayload = {
  entries: HomeSearchEntry[];
  tagCounts: HomeSearchTagCount[];
};

export type HomeSearchState = {
  query: string;
  tags: string[];
};

export type HomeSearchMatchField = 'title' | 'summary' | 'yaml' | 'body' | 'tag';

export type HomeSearchQueryTerm = {
  kind: 'text' | 'tag';
  raw: string;
  normalized: string;
};

export type HomeSearchQueryClause = {
  terms: HomeSearchQueryTerm[];
};

export type HomeSearchParsedQuery = {
  raw: string;
  clauses: HomeSearchQueryClause[];
  terms: HomeSearchQueryTerm[];
  textTerms: string[];
  tagTerms: string[];
  hasAnd: boolean;
  hasOr: boolean;
};

export type HomeSearchResult = {
  entry: HomeSearchEntry;
  matchedFields: HomeSearchMatchField[];
  matchedTags: string[];
  excerpt?: string;
  score: number;
};

export type PreparedHomeSearchEntry = {
  entry: HomeSearchEntry;
  normalizedTitle: string;
  normalizedSummary: string;
  normalizedYaml: string;
  normalizedBody: string;
  normalizedTags: string[];
  normalizedCorpus: string;
};

type TokenizedTerm = HomeSearchQueryTerm | {kind: 'operator'; operator: 'and' | 'or'};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const uniqueValues = (values: readonly string[]): string[] => [...new Set(values.filter(Boolean))];

export const normalizeHomeSearchQuery = (value: string): string =>
  collapseWhitespace(value.normalize('NFKC').toLowerCase());

export const normalizeHomeSearchTag = (value: string): string =>
  normalizeHomeSearchQuery(value).replace(/^#+/, '');

export const tokenizeHomeSearchQuery = (value: string): string[] =>
  uniqueValues(parseHomeSearchExpression(value).textTerms);

export const extractInlineTags = (markdown: string): string[] => {
  const tags = new Set<string>();
  const pattern = /(^|[^\p{L}\p{N}_/])#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu;

  for (const match of markdown.matchAll(pattern)) {
    const tag = normalizeHomeSearchTag(match[2] ?? '');
    if (tag) {
      tags.add(tag);
    }
  }

  return [...tags];
};

const stripWikiLink = (inner: string): string => {
  const separatorIndex = inner.indexOf('|');
  const target = separatorIndex >= 0 ? inner.slice(0, separatorIndex) : inner;
  const label = separatorIndex >= 0 ? inner.slice(separatorIndex + 1) : target;
  return label.trim();
};

export const stripMarkdownToPlainText = (markdown: string): string => {
  const fencedCodePattern = /```[\s\S]*?```/g;
  let text = markdown.replace(/\r\n/g, '\n');

  text = text.replace(
    fencedCodePattern,
    (match) => match.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''),
  );
  text = text.replace(/^>\s*\[!([^\]]+)\](?:[+-])?\s*(.*)$/gm, '$1 $2');
  text = text.replace(/!?\[\[([^[\]]+?)\]\]/g, (_, inner: string) => stripWikiLink(inner));
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-+*]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/\|/g, ' ');
  text = text.replace(/[*_~]+/g, '');

  return collapseWhitespace(text);
};

export const flattenFrontmatterText = (value: unknown): string => {
  const parts: string[] = [];

  const walk = (current: unknown, key?: string): void => {
    if (current === undefined || current === null) {
      return;
    }

    if (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') {
      if (key) {
        parts.push(key);
      }
      parts.push(String(current));
      return;
    }

    if (Array.isArray(current)) {
      if (key) {
        parts.push(key);
      }
      current.forEach((item) => walk(item));
      return;
    }

    if (typeof current === 'object') {
      Object.entries(current as Record<string, unknown>).forEach(([nextKey, nextValue]) => {
        walk(nextValue, nextKey);
      });
    }
  };

  walk(value);
  return collapseWhitespace(parts.join(' '));
};

export const buildHomeSearchEntries = (documents: readonly SourceDocument[]): HomeSearchEntry[] =>
  documents.map((document, index) => ({
    slug: document.meta.slug ?? '',
    title: document.meta.title,
    docType: document.meta.docType,
    date: document.meta.date,
    outputs: [...document.meta.outputs],
    summary: document.meta.summary,
    frontmatterText: flattenFrontmatterText(document.rawFrontmatter),
    frontmatterTags: uniqueValues(document.meta.tags.map(normalizeHomeSearchTag)),
    inlineTags: extractInlineTags(document.body),
    plainBody: stripMarkdownToPlainText(document.body),
    originalOrder: index,
  }));

export const buildHomeSearchTagCounts = (entries: readonly HomeSearchEntry[]): HomeSearchTagCount[] => {
  const counts = new Map<string, number>();

  entries.forEach((entry) => {
    uniqueValues([...entry.frontmatterTags, ...entry.inlineTags]).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([tag, count]) => ({tag, count}))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag, 'ko');
    });
};

export const buildHomeSearchPayload = (documents: readonly SourceDocument[]): HomeSearchPayload => {
  const entries = buildHomeSearchEntries(documents);
  return {
    entries,
    tagCounts: buildHomeSearchTagCounts(entries),
  };
};

export const prepareHomeSearchEntries = (entries: readonly HomeSearchEntry[]): PreparedHomeSearchEntry[] =>
  entries.map((entry) => {
    const normalizedTitle = normalizeHomeSearchQuery(entry.title);
    const normalizedSummary = normalizeHomeSearchQuery(entry.summary ?? '');
    const normalizedYaml = normalizeHomeSearchQuery(entry.frontmatterText);
    const normalizedBody = normalizeHomeSearchQuery(entry.plainBody);
    const normalizedTags = uniqueValues(
      [...entry.frontmatterTags, ...entry.inlineTags].map(normalizeHomeSearchTag),
    );

    return {
      entry,
      normalizedTitle,
      normalizedSummary,
      normalizedYaml,
      normalizedBody,
      normalizedTags,
      normalizedCorpus: collapseWhitespace(
        [normalizedTitle, normalizedSummary, normalizedYaml, normalizedBody, normalizedTags.join(' ')].join(' '),
      ),
    };
  });

const tokenizeExpression = (value: string): TokenizedTerm[] => {
  const tokens: TokenizedTerm[] = [];
  const pattern = /"([^"]+)"|(#[^\s"]+)|\b(AND|OR)\b|([^\s"]+)/giu;

  for (const match of value.matchAll(pattern)) {
    const quoted = match[1];
    const tagToken = match[2];
    const operator = match[3];
    const rawText = match[4];

    if (operator) {
      tokens.push({kind: 'operator', operator: operator.toLowerCase() as 'and' | 'or'});
      continue;
    }

    if (tagToken) {
      const normalizedTag = normalizeHomeSearchTag(tagToken);
      if (normalizedTag) {
        tokens.push({
          kind: 'tag',
          raw: tagToken,
          normalized: normalizedTag,
        });
      }
      continue;
    }

    const raw = collapseWhitespace(quoted ?? rawText ?? '');
    const normalized = normalizeHomeSearchQuery(raw);

    if (!normalized) {
      continue;
    }

    tokens.push({
      kind: 'text',
      raw,
      normalized,
    });
  }

  return tokens;
};

export const parseHomeSearchExpression = (value: string): HomeSearchParsedQuery => {
  const tokens = tokenizeExpression(value);
  const clauses: HomeSearchQueryClause[] = [];
  let currentClause: HomeSearchQueryTerm[] = [];
  let hasAnd = false;
  let hasOr = false;

  tokens.forEach((token) => {
    if (token.kind === 'operator') {
      if (token.operator === 'or') {
        hasOr = true;
        if (currentClause.length > 0) {
          clauses.push({terms: currentClause});
          currentClause = [];
        }
      } else {
        hasAnd = true;
      }
      return;
    }

    currentClause.push(token);
  });

  if (currentClause.length > 0) {
    clauses.push({terms: currentClause});
  }

  const terms = clauses.flatMap((clause) => clause.terms);

  return {
    raw: collapseWhitespace(value),
    clauses,
    terms,
    textTerms: uniqueValues(terms.filter((term) => term.kind === 'text').map((term) => term.raw)),
    tagTerms: uniqueValues(terms.filter((term) => term.kind === 'tag').map((term) => term.normalized)),
    hasAnd,
    hasOr,
  };
};

const collectExcerptCandidate = (
  prepared: PreparedHomeSearchEntry,
  matchedFields: readonly HomeSearchMatchField[],
): string | undefined => {
  if (matchedFields.includes('body')) {
    return prepared.entry.plainBody;
  }

  if (matchedFields.includes('summary') && prepared.entry.summary) {
    return prepared.entry.summary;
  }

  if (matchedFields.includes('yaml')) {
    return prepared.entry.frontmatterText;
  }

  if (matchedFields.includes('tag') && prepared.entry.summary) {
    return prepared.entry.summary;
  }

  if (matchedFields.includes('title')) {
    return prepared.entry.title;
  }

  return prepared.entry.summary ?? prepared.entry.title;
};

const buildExcerpt = (source: string, needles: readonly string[]): string | undefined => {
  const lookupTerms = uniqueValues(
    needles.map((value) => collapseWhitespace(value)).filter(Boolean),
  );
  const lowered = source.toLowerCase();
  let matchIndex = -1;
  let matchLength = 0;

  for (const term of lookupTerms) {
    const index = lowered.indexOf(term.toLowerCase());
    if (index >= 0 && (matchIndex < 0 || index < matchIndex)) {
      matchIndex = index;
      matchLength = term.length;
    }
  }

  if (matchIndex < 0) {
    return collapseWhitespace(source).slice(0, 180);
  }

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(source.length, matchIndex + Math.max(matchLength, 20) + 72);
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < source.length ? ' ...' : '';

  return `${prefix}${collapseWhitespace(source.slice(start, end))}${suffix}`;
};

const matchesTag = (tags: readonly string[], queryTag: string): string[] =>
  tags.filter((tag) => tag.includes(queryTag));

const getMatchedFieldsForTextTerm = (
  prepared: PreparedHomeSearchEntry,
  queryTerm: string,
): {fields: HomeSearchMatchField[]; matchedTags: string[]} => {
  const fields: HomeSearchMatchField[] = [];
  const matchedTags = matchesTag(prepared.normalizedTags, queryTerm);

  if (prepared.normalizedTitle.includes(queryTerm)) {
    fields.push('title');
  }

  if (prepared.normalizedSummary.includes(queryTerm)) {
    fields.push('summary');
  }

  if (prepared.normalizedYaml.includes(queryTerm)) {
    fields.push('yaml');
  }

  if (prepared.normalizedBody.includes(queryTerm)) {
    fields.push('body');
  }

  if (matchedTags.length > 0) {
    fields.push('tag');
  }

  return {fields, matchedTags};
};

const scoreTextTerm = (fields: readonly HomeSearchMatchField[]): number => {
  let score = 0;

  if (fields.includes('title')) {
    score += 140;
  }

  if (fields.includes('tag')) {
    score += 92;
  }

  if (fields.includes('yaml')) {
    score += 88;
  }

  if (fields.includes('summary')) {
    score += 62;
  }

  if (fields.includes('body')) {
    score += 36;
  }

  return score;
};

const scorePreparedEntry = (
  prepared: PreparedHomeSearchEntry,
  parsedQuery: HomeSearchParsedQuery,
  legacySelectedTags: readonly string[],
): {score: number; matchedFields: HomeSearchMatchField[]; matchedTags: string[]; excerpt?: string} => {
  const matchedFields = new Set<HomeSearchMatchField>();
  const matchedTags = new Set<string>();
  let score = 0;

  parsedQuery.terms.forEach((term) => {
    if (term.kind === 'tag') {
      const tags = matchesTag(prepared.normalizedTags, term.normalized);
      if (tags.length > 0) {
        matchedFields.add('tag');
        tags.forEach((tag) => matchedTags.add(tag));
        score += 96 + tags.length * 14;
      }
      return;
    }

    const {fields, matchedTags: fieldTags} = getMatchedFieldsForTextTerm(prepared, term.normalized);
    fields.forEach((field) => matchedFields.add(field));
    fieldTags.forEach((tag) => matchedTags.add(tag));
    score += scoreTextTerm(fields) + term.normalized.length;
  });

  legacySelectedTags.forEach((tag) => {
    const tags = matchesTag(prepared.normalizedTags, tag);
    if (tags.length > 0) {
      matchedFields.add('tag');
      tags.forEach((value) => matchedTags.add(value));
      score += 48;
    }
  });

  const fieldOrder: readonly HomeSearchMatchField[] = ['title', 'summary', 'yaml', 'body', 'tag'];
  const orderedFields: HomeSearchMatchField[] = fieldOrder.filter((field) =>
    matchedFields.has(field),
  );
  const orderedTags = [...matchedTags].sort((left, right) => left.localeCompare(right, 'ko'));
  const excerptSource = collectExcerptCandidate(prepared, orderedFields);
  const highlightNeedles = [
    ...parsedQuery.textTerms,
    ...parsedQuery.tagTerms,
    ...legacySelectedTags,
  ];

  return {
    score,
    matchedFields: orderedFields,
    matchedTags: orderedTags,
    excerpt: excerptSource ? buildExcerpt(excerptSource, highlightNeedles) : undefined,
  };
};

const entryMatchesClause = (prepared: PreparedHomeSearchEntry, clause: HomeSearchQueryClause): boolean =>
  clause.terms.every((term) => {
    if (term.kind === 'tag') {
      return matchesTag(prepared.normalizedTags, term.normalized).length > 0;
    }

    return getMatchedFieldsForTextTerm(prepared, term.normalized).fields.length > 0;
  });

export const searchPreparedHomeEntries = (
  preparedEntries: readonly PreparedHomeSearchEntry[],
  state: HomeSearchState,
): HomeSearchResult[] => {
  const parsedQuery = parseHomeSearchExpression(state.query);
  const legacySelectedTags = uniqueValues(state.tags.map(normalizeHomeSearchTag));

  const mapped = preparedEntries
    .filter((prepared) => {
      const matchesLegacyTags =
        legacySelectedTags.length === 0 ||
        legacySelectedTags.some((tag) => matchesTag(prepared.normalizedTags, tag).length > 0);

      if (!matchesLegacyTags) {
        return false;
      }

      if (parsedQuery.clauses.length === 0) {
        return true;
      }

      return parsedQuery.clauses.some((clause) => entryMatchesClause(prepared, clause));
    })
    .map((prepared) => {
      const {score, matchedFields, matchedTags, excerpt} = scorePreparedEntry(
        prepared,
        parsedQuery,
        legacySelectedTags,
      );

      return {
        entry: prepared.entry,
        matchedFields,
        matchedTags,
        excerpt,
        score: parsedQuery.terms.length > 0 ? score : 0,
      };
    });

  mapped.sort((left, right) => {
    if (parsedQuery.terms.length === 0 && left.entry.originalOrder !== right.entry.originalOrder) {
      return left.entry.originalOrder - right.entry.originalOrder;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.entry.originalOrder - right.entry.originalOrder;
  });

  return mapped;
};

export const searchHomeEntries = (
  entries: readonly HomeSearchEntry[],
  state: HomeSearchState,
): HomeSearchResult[] => searchPreparedHomeEntries(prepareHomeSearchEntries(entries), state);

const normalizeTagsForState = (tags: readonly string[]): string[] =>
  uniqueValues(tags.map(normalizeHomeSearchTag)).sort((left, right) => left.localeCompare(right, 'ko'));

export const parseHomeSearchState = (input: string | URLSearchParams): HomeSearchState => {
  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
      : input;

  const query = collapseWhitespace(params.get('q') ?? '');
  const rawTags = params.get('tags') ?? '';
  const tags = normalizeTagsForState(
    rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  );

  return {query, tags};
};

export const serializeHomeSearchState = (state: HomeSearchState): string => {
  const params = new URLSearchParams();
  const query = collapseWhitespace(state.query);
  const tags = normalizeTagsForState(state.tags);

  if (query) {
    params.set('q', query);
  }

  if (tags.length > 0) {
    params.set('tags', tags.join(','));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const highlightHomeSearchText = (value: string, query: string): string => {
  const parsedQuery = parseHomeSearchExpression(query);
  const tokens = uniqueValues([
    ...parsedQuery.textTerms,
    ...parsedQuery.tagTerms,
  ]).filter(Boolean);

  if (tokens.length === 0) {
    return escapeHtml(value);
  }

  const pattern = new RegExp(
    tokens.sort((left, right) => right.length - left.length).map(escapeRegExp).join('|'),
    'giu',
  );
  let lastIndex = 0;
  let html = '';

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    const text = match[0] ?? '';
    html += escapeHtml(value.slice(lastIndex, index));
    html += `<mark>${escapeHtml(text)}</mark>`;
    lastIndex = index + text.length;
  }

  html += escapeHtml(value.slice(lastIndex));
  return html;
};
