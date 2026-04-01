import path from 'node:path';

import GithubSlugger from 'github-slugger';

import {normalizeSlug} from './slugs';
import type {DocType, OutputMode, SourceDocument} from './types';

type LookupEntry = {
  slug: string;
  title: string;
};

export type ObsidianLinkLookup = {
  byKey: Map<string, LookupEntry>;
};

const normalizeKey = (value: string): string =>
  value
    .trim()
    .replace(/\.mdx?$/i, '')
    .replace(/\\/g, '/')
    .toLowerCase();

const firstHeadingPattern = /^#{1,6}\s+(.+?)\s*$/m;

const extractFirstHeading = (body: string): string | undefined => body.match(firstHeadingPattern)?.[1]?.trim();
const isMissingValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const inferDocType = (relativePath: string, title: string): DocType => {
  const normalizedPath = relativePath.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (
    normalizedPath.includes('teaching materials') ||
    normalizedTitle.includes('특강') ||
    normalizedTitle.includes('강의') ||
    normalizedTitle.includes('교재')
  ) {
    return 'lecture';
  }

  if (normalizedPath.includes('newsletter') || normalizedTitle.includes('newsletter') || normalizedTitle.includes('weekly')) {
    return 'newsletter';
  }

  return 'note';
};

const inferOutputs = (docType: DocType): OutputMode[] => {
  if (docType === 'lecture') {
    return ['reader', 'stage'];
  }

  if (docType === 'newsletter') {
    return ['reader', 'newsletter'];
  }

  return ['reader'];
};

const inferAuthor = (raw: Record<string, unknown>): string | undefined => {
  const author = raw.author;
  if (typeof author === 'string' && author.trim()) {
    return author.trim();
  }

  const koreanAuthor = raw['저자:'];
  if (Array.isArray(koreanAuthor)) {
    return koreanAuthor.map((entry) => String(entry).trim()).filter(Boolean).join(', ') || undefined;
  }

  if (typeof koreanAuthor === 'string' && koreanAuthor.trim()) {
    return koreanAuthor.trim();
  }

  return undefined;
};

const inferDate = (raw: Record<string, unknown>): string | undefined => {
  if (typeof raw.date === 'string' && raw.date.trim()) {
    return raw.date.trim();
  }

  if (typeof raw['date created'] === 'string' && raw['date created'].trim()) {
    return raw['date created'].trim();
  }

  return undefined;
};

const inferTitle = (raw: Record<string, unknown>, body: string, filePath: string): string => {
  if (typeof raw.title === 'string' && raw.title.trim()) {
    return raw.title.trim();
  }

  const heading = extractFirstHeading(body);
  if (heading) {
    return heading;
  }

  return path.basename(filePath, path.extname(filePath));
};

export const enrichObsidianFrontmatter = ({
  raw,
  body,
  filePath,
  relativePath,
}: {
  raw: Record<string, unknown>;
  body: string;
  filePath: string;
  relativePath: string;
}): {raw: Record<string, unknown>; warnings: string[]} => {
  const warnings: string[] = [];
  const nextRaw = {...raw};
  const title = inferTitle(raw, body, filePath);

  if (isMissingValue(raw.title)) {
    nextRaw.title = title;
    warnings.push(`Inferred title from heading or filename for ${relativePath}.`);
  }

  if (isMissingValue(nextRaw.docType)) {
    nextRaw.docType = inferDocType(relativePath, title);
    warnings.push(`Inferred docType for ${relativePath}.`);
  }

  if (isMissingValue(nextRaw.outputs)) {
    nextRaw.outputs = inferOutputs(nextRaw.docType as DocType);
    warnings.push(`Inferred outputs for ${relativePath}.`);
  }

  if (isMissingValue(nextRaw.author)) {
    const author = inferAuthor(raw);
    if (author) {
      nextRaw.author = author;
    }
  }

  if (isMissingValue(nextRaw.date)) {
    const date = inferDate(raw);
    if (date) {
      nextRaw.date = date;
    }
  }

  return {raw: nextRaw, warnings};
};

export const createObsidianLinkLookup = (documents: SourceDocument[]): ObsidianLinkLookup => {
  const byKey = new Map<string, LookupEntry>();

  const add = (key: string | undefined, entry: LookupEntry): void => {
    if (!key) {
      return;
    }

    byKey.set(normalizeKey(key), entry);
  };

  for (const document of documents) {
    const entry = {
      slug: document.meta.slug ?? normalizeSlug(document.meta.title),
      title: document.meta.title,
    };

    add(document.meta.title, entry);
    add(path.basename(document.filePath, path.extname(document.filePath)), entry);
    add(document.relativePath, entry);
    add(document.relativePath.replace(path.extname(document.relativePath), ''), entry);

    const aliases = document.rawFrontmatter.aliases;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        add(String(alias), entry);
      }
    } else if (typeof aliases === 'string') {
      add(aliases, entry);
    }
  }

  return {byKey};
};

const resolveWikiTarget = (
  target: string,
  lookup: ObsidianLinkLookup,
): {url?: string; label: string; missing: boolean} => {
  const trimmed = target.trim();
  const pipeLabel = trimmed;

  if (trimmed.startsWith('#')) {
    const heading = trimmed.slice(1);
    return {
      url: `#${new GithubSlugger().slug(heading)}`,
      label: heading,
      missing: false,
    };
  }

  const [pagePartRaw, headingPart] = trimmed.split('#');
  const pagePart = pagePartRaw.trim();
  const entry = lookup.byKey.get(normalizeKey(pagePart));
  const anchor = headingPart ? `#${new GithubSlugger().slug(headingPart)}` : '';

  if (!entry) {
    return {
      label: pipeLabel,
      missing: true,
    };
  }

  return {
    url: `/reader/${entry.slug}${anchor}`,
    label: entry.title,
    missing: false,
  };
};

const calloutLinePattern = /^>\s*\[!([^\]]+)\](?:[+-])?\s*(.*)$/gm;
export const OBSIDIAN_CALLOUT_MARKER = 'achmage-callout';

export const preprocessObsidianMarkdown = (
  markdown: string,
  _current: SourceDocument,
  lookup: ObsidianLinkLookup,
): string => {
  const withCallouts = markdown.replace(calloutLinePattern, (_, type: string, title: string) =>
    `> **${type}${title?.trim() ? ` - ${title.trim()}` : ''}** <!--${OBSIDIAN_CALLOUT_MARKER}-->`,
  );

  const withoutBlockRefs = withCallouts.replace(/\s+\^[A-Za-z0-9-]+$/gm, '');

  return withoutBlockRefs.replace(/(!)?\[\[([^[\]]+?)\]\]/g, (_, bang: string | undefined, inner: string) => {
    const separatorIndex = inner.indexOf('|');
    const target = separatorIndex >= 0 ? inner.slice(0, separatorIndex) : inner;
    const label = separatorIndex >= 0 ? inner.slice(separatorIndex + 1).trim() : target.trim();
    const isEmbed = bang === '!';
    const trimmedTarget = target.trim();

    if (isEmbed) {
      const hasImageExtension = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(trimmedTarget);
      if (hasImageExtension) {
        return `![](<${trimmedTarget}>)`;
      }

      const resolved = resolveWikiTarget(trimmedTarget, lookup);
      return resolved.url ? `> Embedded note: [${label}](${resolved.url})` : `> Embedded note: ${label}`;
    }

    const resolved = resolveWikiTarget(trimmedTarget, lookup);
    if (!resolved.url) {
      return label;
    }

    return `[${separatorIndex >= 0 ? label : resolved.label}](${resolved.url})`;
  });
};
