import {z} from 'zod';

import type {DocFrontmatter, DocType, OutputMode, SourceConfidence, ThemeMode, TocDepthOption} from './types';

const docTypeSchema = z.enum(['lecture', 'newsletter', 'note', 'handout']);
const outputSchema = z.enum(['reader', 'stage', 'newsletter']);
const themeSchema = z.enum(['light', 'dark', 'auto']);
const tocSchema = z.enum(['auto', 'manual', 'none']);
const tocMaxDepthSchema = z.union([z.literal('auto'), z.literal(1), z.literal(2), z.literal(3)]);
const sourceConfidenceSchema = z.enum(['low', 'medium', 'high']);

const parseOptional = <T>(
  field: string,
  value: unknown,
  schema: z.ZodType<T>,
  warnings: string[],
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  warnings.push(`Invalid optional field "${field}" was ignored.`);
  return undefined;
};

export const normalizeFrontmatter = (raw: Record<string, unknown>): {meta: DocFrontmatter; warnings: string[]} => {
  const warnings: string[] = [];
  const titleResult = z.string().trim().min(1, 'title is required').parse(raw.title);
  const docTypeResult = docTypeSchema.parse(raw.docType);
  const outputsResult = z.array(outputSchema).min(1, 'outputs is required').parse(raw.outputs);

  const slug = parseOptional('slug', raw.slug, z.string().trim().min(1), warnings);
  const theme = (parseOptional('theme', raw.theme, themeSchema, warnings) ?? 'light') as ThemeMode;
  const author = parseOptional('author', raw.author, z.string().trim().min(1), warnings);
  const date = parseOptional('date', raw.date, z.string().trim().min(1), warnings);
  const tags =
    parseOptional('tags', raw.tags, z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]), warnings) ?? [];
  const summary = parseOptional('summary', raw.summary, z.string().trim().min(1), warnings);
  const heroLabel = parseOptional('heroLabel', raw.heroLabel, z.string().trim().min(1), warnings);
  const tocValue = parseOptional('toc', raw.toc, tocSchema, warnings) ?? 'auto';
  const toc = tocValue === 'manual' ? 'auto' : tocValue;
  if (tocValue === 'manual') {
    warnings.push('toc: manual is not supported in V1 and falls back to auto.');
  }

  const tocMaxDepth = (parseOptional('tocMaxDepth', raw.tocMaxDepth, tocMaxDepthSchema, warnings) ??
    'auto') as TocDepthOption;
  const tocTitle = parseOptional('tocTitle', raw.tocTitle, z.string().trim().min(1), warnings) ?? 'TABLE_OF_CONTENTS';

  const stageInput = parseOptional(
    'stage',
    raw.stage,
    z
      .object({
        enabled: z.boolean().optional(),
        focusMode: z.boolean().optional(),
        keyboardNav: z.boolean().optional(),
        revealLists: z.boolean().optional(),
      })
      .strict(),
    warnings,
  );

  const aiInput = parseOptional(
    'ai',
    raw.ai,
    z
      .object({
        assisted: z.boolean().optional(),
        model: z.string().trim().min(1).optional(),
        generatedAt: z.string().trim().min(1).optional(),
        sourceConfidence: sourceConfidenceSchema.optional(),
        basedOn: z.array(z.string().trim().min(1)).optional(),
      })
      .strict(),
    warnings,
  );

  const railInput = parseOptional(
    'rail',
    raw.rail,
    z
      .object({
        showMetadata: z.boolean().optional(),
        showTags: z.boolean().optional(),
        showToc: z.boolean().optional(),
      })
      .strict(),
    warnings,
  );

  const outputs = Array.from(new Set(outputsResult)) as OutputMode[];
  const normalizedTags = Array.isArray(tags) ? tags : [tags];
  const ai =
    aiInput === undefined
      ? undefined
      : {
          assisted: aiInput.assisted ?? true,
          model: aiInput.model,
          generatedAt: aiInput.generatedAt,
          sourceConfidence: aiInput.sourceConfidence as SourceConfidence | undefined,
          basedOn: aiInput.basedOn ?? [],
        };

  const meta: DocFrontmatter = {
    title: titleResult,
    docType: docTypeResult as DocType,
    outputs,
    theme,
    author,
    date,
    tags: normalizedTags,
    summary,
    heroLabel,
    toc: toc === 'none' ? 'none' : 'auto',
    tocMaxDepth,
    tocTitle,
    stage: {
      enabled: stageInput?.enabled ?? outputs.includes('stage'),
      focusMode: stageInput?.focusMode ?? true,
      keyboardNav: stageInput?.keyboardNav ?? true,
      revealLists: stageInput?.revealLists ?? false,
    },
    ai,
    rail: {
      showMetadata: railInput?.showMetadata ?? true,
      showTags: railInput?.showTags ?? true,
      showToc: railInput?.showToc ?? true,
    },
  };

  if (slug) {
    meta.slug = slug;
  }

  return {meta, warnings};
};
