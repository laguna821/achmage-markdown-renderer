import YAML from 'yaml';

import {createObsidianLinkLookup, enrichObsidianFrontmatter, preprocessObsidianMarkdown} from './obsidian';
import {getDirname, normalizePathSeparators} from './path-utils';
import {normalizeFrontmatter} from './schema';
import {flattenRelativePathToSlug, normalizeSlug} from './slugs';
import type {SourceDocument, VaultFileSnapshot, VaultSnapshot} from './types';

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const parseRawFrontmatter = (file: VaultFileSnapshot): {data: Record<string, unknown>; body: string} => {
  const match = file.content.match(frontmatterPattern);
  if (!match) {
    return {data: {}, body: file.content};
  }

  const rawYaml = match[1] ?? '';
  const parsed = YAML.parse(rawYaml);
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};

  return {
    data,
    body: file.content.slice(match[0].length),
  };
};

export const parseSourceFile = (file: VaultFileSnapshot, sourceRoot: string): SourceDocument => {
  const normalizedRoot = normalizePathSeparators(sourceRoot);
  const normalizedPath = normalizePathSeparators(file.filePath);
  const normalizedRelativePath = normalizePathSeparators(file.relativePath);
  const parsed = parseRawFrontmatter(file);
  const enriched = enrichObsidianFrontmatter({
    raw: parsed.data,
    body: parsed.body,
    filePath: normalizedPath,
    relativePath: normalizedRelativePath,
  });
  const {meta, warnings} = normalizeFrontmatter(enriched.raw);
  const autoSlug = flattenRelativePathToSlug(normalizedRelativePath);

  return {
    filePath: normalizedPath,
    relativePath: normalizedRelativePath,
    sourceRoot: normalizedRoot,
    sourceDir: getDirname(normalizedPath),
    body: parsed.body.trim(),
    rawFrontmatter: enriched.raw,
    meta: {
      ...meta,
      slug: meta.slug ? normalizeSlug(meta.slug) : autoSlug,
    },
    warnings: [...enriched.warnings, ...warnings],
  };
};

export const findDuplicateSlugGroups = (
  documents: readonly SourceDocument[],
): Array<{slug: string; relativePaths: string[]; hasExplicitSlug: boolean}> => {
  const grouped = new Map<string, {relativePaths: string[]; hasExplicitSlug: boolean}>();

  for (const document of documents) {
    const slug = document.meta.slug ?? '';
    const existing = grouped.get(slug);
    if (existing) {
      existing.relativePaths.push(document.relativePath);
      existing.hasExplicitSlug ||= typeof document.rawFrontmatter.slug === 'string' && document.rawFrontmatter.slug.trim().length > 0;
      continue;
    }

    grouped.set(slug, {
      relativePaths: [document.relativePath],
      hasExplicitSlug: typeof document.rawFrontmatter.slug === 'string' && document.rawFrontmatter.slug.trim().length > 0,
    });
  }

  return [...grouped.entries()]
    .filter(([, group]) => group.relativePaths.length > 1)
    .map(([slug, group]) => ({
      slug,
      relativePaths: group.relativePaths,
      hasExplicitSlug: group.hasExplicitSlug,
    }));
};

export const applyObsidianPreprocessing = (documents: SourceDocument[]): SourceDocument[] => {
  const lookup = createObsidianLinkLookup(documents);
  for (const document of documents) {
    document.body = preprocessObsidianMarkdown(document.body, document, lookup);
  }

  return documents;
};

export const createSourceDocuments = (snapshot: VaultSnapshot): SourceDocument[] => {
  const documents = snapshot.files.map((file) => parseSourceFile(file, snapshot.state.rootPath));
  const duplicateGroups = findDuplicateSlugGroups(documents);
  if (duplicateGroups.length > 0) {
    throw new Error(`Duplicate slug detected: ${duplicateGroups[0]?.slug ?? 'unknown'}`);
  }

  return applyObsidianPreprocessing(documents);
};
