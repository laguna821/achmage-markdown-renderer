import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';
import matter from 'gray-matter';

import {createObsidianLinkLookup, enrichObsidianFrontmatter, preprocessObsidianMarkdown} from './obsidian';
import {normalizeFrontmatter} from './schema';
import {flattenRelativePathToSlug, normalizeSlug} from './slugs';
import type {OutputMode, SourceDocument} from './types';

const CONTENT_ROOT_FILE = '.doc-workspace-content-dir';

let cachedDocuments: SourceDocument[] | null = null;
let cachedRoot: string | null = null;

const resolveDefaultContentRoot = (): string => path.resolve(process.cwd(), 'src/content/docs');

const resolveFileConfiguredRoot = (): string | null => {
  const configPath = path.resolve(process.cwd(), CONTENT_ROOT_FILE);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const configured = fs.readFileSync(configPath, 'utf8').trim();
  if (!configured) {
    return null;
  }

  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
};

export const getContentRootInfo = (): {root: string; source: 'env' | 'file' | 'default'} => {
  const configured = process.env.DOC_WORKSPACE_CONTENT_DIR?.trim();
  if (!configured) {
    const fileConfigured = resolveFileConfiguredRoot();
    if (fileConfigured) {
      return {root: fileConfigured, source: 'file'};
    }

    return {root: resolveDefaultContentRoot(), source: 'default'};
  }

  return {
    root: path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured),
    source: 'env',
  };
};

export const resolveContentRoot = (): string => {
  return getContentRootInfo().root;
};

export const clearSourceCache = (): void => {
  cachedDocuments = null;
  cachedRoot = null;
};

export const parseSourceFile = ({
  filePath,
  raw,
  sourceRoot,
}: {
  filePath: string;
  raw?: string;
  sourceRoot?: string;
}): SourceDocument => {
  const resolvedSourceRoot = sourceRoot ? path.resolve(sourceRoot) : resolveContentRoot();
  const fileContents = raw ?? fs.readFileSync(filePath, 'utf8');
  const parsed = matter(fileContents);
  const relativePath = path.relative(resolvedSourceRoot, filePath);
  const enriched = enrichObsidianFrontmatter({
    raw: parsed.data as Record<string, unknown>,
    body: parsed.content,
    filePath,
    relativePath,
  });
  const {meta, warnings} = normalizeFrontmatter(enriched.raw);
  const autoSlug = flattenRelativePathToSlug(resolvedSourceRoot, filePath);

  return {
    filePath,
    relativePath,
    sourceRoot: resolvedSourceRoot,
    sourceDir: path.dirname(filePath),
    body: parsed.content.trim(),
    rawFrontmatter: enriched.raw,
    meta: {
      ...meta,
      slug: meta.slug ? normalizeSlug(meta.slug) : autoSlug,
    },
    warnings: [...enriched.warnings, ...warnings],
  };
};

export const loadSourceDocuments = (sourceRoot = resolveContentRoot()): SourceDocument[] => {
  const resolvedRoot = path.resolve(sourceRoot);
  if (cachedDocuments && cachedRoot === resolvedRoot) {
    return cachedDocuments;
  }

  if (!fs.existsSync(resolvedRoot)) {
    cachedDocuments = [];
    cachedRoot = resolvedRoot;
    return cachedDocuments;
  }

  const files = fg.sync(['**/*.md', '**/*.mdx'], {
    cwd: resolvedRoot,
    absolute: true,
    onlyFiles: true,
  });

  const documents = files.map((filePath) => parseSourceFile({filePath, sourceRoot: resolvedRoot}));
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

  cachedDocuments = documents;
  cachedRoot = resolvedRoot;
  return documents;
};

export const filterDocumentsByOutput = (documents: SourceDocument[], output: OutputMode): SourceDocument[] =>
  documents.filter((document) => document.meta.outputs.includes(output));
