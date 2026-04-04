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

const parseSourceFile = (file: VaultFileSnapshot, sourceRoot: string): SourceDocument => {
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

export const createSourceDocuments = (snapshot: VaultSnapshot): SourceDocument[] => {
  const documents = snapshot.files.map((file) => parseSourceFile(file, snapshot.state.rootPath));
  const slugSet = new Set<string>();

  for (const document of documents) {
    const slug = document.meta.slug ?? '';
    if (slugSet.has(slug)) {
      throw new Error(`Duplicate slug detected: ${slug}`);
    }

    slugSet.add(slug);
  }

  const lookup = createObsidianLinkLookup(documents);
  for (const document of documents) {
    document.body = preprocessObsidianMarkdown(document.body, document, lookup);
  }

  return documents;
};
