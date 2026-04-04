import type {DocFrontmatter, NormalizedBlock, NormalizedDoc} from '../core/content';

export type RailSourceLink = {
  href: string;
  label: string;
};

export type DocumentInsights = {
  thesis: string | null;
  keyLine: string | null;
  standfirst: string | null;
  sources: RailSourceLink[];
  kicker: string;
  metaTrail: string[];
  thesisLabel: string;
};

const htmlEntityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const decodeBasicEntities = (value: string): string =>
  value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => htmlEntityMap[match] ?? match);

const stripHtml = (value: string): string =>
  normalizeWhitespace(
    decodeBasicEntities(
      value
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|li|blockquote|section|article|h[1-6])>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );

const splitHtmlIntoParagraphs = (value: string): string[] => {
  const paragraphMatches = value.match(/<(p|li|blockquote)\b[\s\S]*?<\/(p|li|blockquote)>/gi) ?? [];
  if (paragraphMatches.length === 0) {
    const fallback = stripHtml(value);
    return fallback ? [fallback] : [];
  }

  return paragraphMatches.map((entry) => stripHtml(entry)).filter(Boolean);
};

const normalizeTextKey = (value: string): string => normalizeWhitespace(value).toLowerCase();

const isDistinctText = (candidate: string, existing: readonly string[]): boolean => {
  const nextKey = normalizeTextKey(candidate);
  return existing.every((entry) => normalizeTextKey(entry) !== nextKey);
};

const truncateForStandfirst = (value: string, maxLength = 110): string => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const punctuationIndex = normalized
    .slice(0, maxLength + 20)
    .search(/[.!?。！？](?=\s|$)/);

  if (punctuationIndex >= 48) {
    return normalized.slice(0, punctuationIndex + 1).trim();
  }

  const lastSpace = normalized.lastIndexOf(' ', maxLength);
  if (lastSpace >= 40) {
    return `${normalized.slice(0, lastSpace).trim()}…`;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
};

const isExternalHref = (href: string): boolean => /^(https?:)?\/\//i.test(href);

const extractLinksFromHtml = (value: string): RailSourceLink[] => {
  const matches = value.matchAll(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi);
  const links: RailSourceLink[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const href = normalizeWhitespace(match[2] ?? '');
    if (!isExternalHref(href) || seen.has(href)) {
      continue;
    }

    const label = stripHtml(match[3] ?? '') || href;
    seen.add(href);
    links.push({href, label});
  }

  return links;
};

const extractTextCandidatesFromBlock = (block: NormalizedBlock): string[] => {
  switch (block.kind) {
    case 'thesis':
    case 'docQuote':
      return [stripHtml(block.content)].filter(Boolean);
    case 'callout':
      return [];
    case 'prose':
      return splitHtmlIntoParagraphs(block.html).slice(0, 3);
    case 'questionReset':
      return block.items.flatMap((item) => [item.title, stripHtml(item.body)]).filter(Boolean);
    case 'evidenceGrid':
      return block.items.flatMap((item) => [item.title, stripHtml(item.body)]).filter(Boolean);
    case 'evidencePanel':
      return [block.item.title, stripHtml(block.item.body)].filter(Boolean);
    default:
      return [];
  }
};

const extractLinksFromBlock = (block: NormalizedBlock): RailSourceLink[] => {
  switch (block.kind) {
    case 'thesis':
    case 'docQuote':
      return extractLinksFromHtml(block.content);
    case 'callout':
      return extractLinksFromHtml(block.content);
    case 'prose':
      return extractLinksFromHtml(block.html);
    case 'questionReset':
      return block.items.flatMap((item) => extractLinksFromHtml(item.body));
    case 'evidenceGrid':
      return block.items.flatMap((item) => extractLinksFromHtml(item.body));
    case 'evidencePanel':
      return extractLinksFromHtml(block.item.body);
    default:
      return [];
  }
};

const docTypeMetaLabelMap: Record<DocFrontmatter['docType'], string> = {
  note: 'THESIS-FIRST DOCUMENT',
  lecture: 'LECTURE DOCUMENT',
  newsletter: 'NEWSLETTER DOCUMENT',
  handout: 'TEACHING HANDOUT',
};

const docTypeKickerMap: Record<DocFrontmatter['docType'], string> = {
  note: 'LONG-FORM NOTE',
  lecture: 'LECTURE NOTE',
  newsletter: 'NEWSLETTER DRAFT',
  handout: 'TEACHING HANDOUT',
};

const thesisLabelMap: Record<DocFrontmatter['docType'], string> = {
  note: 'Weekly Thesis / v2',
  lecture: 'Lecture Thesis / v2',
  newsletter: 'Newsletter Thesis / v2',
  handout: 'Handout Thesis / v2',
};

const buildFallbackKicker = (meta: DocFrontmatter): string => {
  if (meta.heroLabel?.trim()) {
    return meta.heroLabel.trim();
  }

  if (meta.docType === 'note' && meta.outputs.includes('newsletter')) {
    return 'Long-form note & newsletter draft';
  }

  return docTypeKickerMap[meta.docType];
};

export function deriveDocumentInsights(doc: NormalizedDoc): DocumentInsights {
  const textCandidates: string[] = [];
  const highPriorityCandidates: string[] = [];
  const lowPriorityCandidates: string[] = [];

  if (doc.meta.summary?.trim()) {
    textCandidates.push(normalizeWhitespace(doc.meta.summary));
  }

  for (const section of doc.sections) {
    for (const block of section.blocks) {
      const blockCandidates = extractTextCandidatesFromBlock(block);
      if (block.kind === 'prose') {
        lowPriorityCandidates.push(...blockCandidates);
        continue;
      }

      highPriorityCandidates.push(...blockCandidates);
    }
  }

  for (const candidate of [...highPriorityCandidates, ...lowPriorityCandidates]) {
    if (candidate && isDistinctText(candidate, textCandidates)) {
      textCandidates.push(candidate);
    }
  }

  const thesis = textCandidates[0] ?? null;
  const keyLine = textCandidates.find((candidate) => thesis !== null && isDistinctText(candidate, [thesis])) ?? null;
  const standfirst = thesis ? truncateForStandfirst(thesis) : keyLine ? truncateForStandfirst(keyLine) : null;

  const sources: RailSourceLink[] = [];
  const seenSources = new Set<string>();
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      for (const source of extractLinksFromBlock(block)) {
        if (seenSources.has(source.href)) {
          continue;
        }
        seenSources.add(source.href);
        sources.push(source);
      }
    }
  }

  return {
    thesis,
    keyLine: keyLine && (!thesis || normalizeTextKey(keyLine) !== normalizeTextKey(thesis)) ? keyLine : null,
    standfirst,
    sources: sources.slice(0, 5),
    kicker: buildFallbackKicker(doc.meta),
    metaTrail: ['ACHMAGE', docTypeMetaLabelMap[doc.meta.docType], ...(doc.meta.date ? [doc.meta.date] : [])],
    thesisLabel: thesisLabelMap[doc.meta.docType],
  };
}
