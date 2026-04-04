import GithubSlugger from 'github-slugger';

import {extractEvidenceTag, matchAlias} from './aliases';
import {generateToc} from './headings';
import {createSourceDocuments} from './ingest';
import {annotateHeadingIds, extractInlineTokens, getNodeText, parseMarkdown, renderInlineNodes, renderNodes} from './markdown';
import {OBSIDIAN_CALLOUT_MARKER, OBSIDIAN_CALLOUT_META_MARKER} from './obsidian';
import type {
  EvidenceItem,
  InlineToken,
  MdNode,
  MdRoot,
  NormalizedBlock,
  NormalizedDoc,
  NormalizedSection,
  RichBlockContent,
  SourceDocument,
  TocItem,
  VaultSnapshot,
} from './types';
import {richTextToPlainText} from '../pretext/rich-text';

const isHeading = (node: MdNode, depth?: number): boolean => node.type === 'heading' && (depth === undefined || node.depth === depth);
const isStandaloneImageParagraph = (node: MdNode): boolean =>
  node.type === 'paragraph' &&
  (node.children?.length ?? 0) === 1 &&
  (node.children?.[0]?.type === 'image' || node.children?.[0]?.type === 'imageReference');

const partitionByChildHeadings = (nodes: MdNode[], childDepth: number): Array<{heading: MdNode; nodes: MdNode[]}> => {
  const groups: Array<{heading: MdNode; nodes: MdNode[]}> = [];
  let current: {heading: MdNode; nodes: MdNode[]} | null = null;

  for (const node of nodes) {
    if (isHeading(node, childDepth)) {
      current = {heading: node, nodes: []};
      groups.push(current);
      continue;
    }

    current?.nodes.push(node);
  }

  return groups;
};

const markdownTableToAxisData = (tableNode: MdNode): {headers: string[]; rows: string[][]} => {
  const rows = tableNode.children ?? [];
  const headerRow = rows[0];
  const headers = (headerRow?.children ?? []).map((cell) => renderInlineNodes(cell.children ?? []));
  const bodyRows = rows.slice(1).map((row) => (row.children ?? []).map((cell) => renderInlineNodes(cell.children ?? [])));

  return {headers, rows: bodyRows};
};

const flushProse = (nodes: MdNode[], blocks: NormalizedBlock[]): void => {
  if (nodes.length === 0) {
    return;
  }

  blocks.push({
    kind: 'prose',
    html: renderNodes(nodes),
  });
  nodes.length = 0;
};

const buildRichBlockContent = (nodes: MdNode[]): RichBlockContent | undefined => {
  const tokens: InlineToken[] = [];

  nodes.forEach((node, index) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      tokens.push(...extractInlineTokens(node.children ?? []));
    } else if (node.type === 'text' && node.value) {
      tokens.push({kind: 'text', value: node.value});
    } else if (node.type === 'break') {
      tokens.push({kind: 'br'});
    } else if (node.children?.length) {
      tokens.push(...extractInlineTokens(node.children));
    } else if (node.value) {
      tokens.push({kind: 'text', value: node.value});
    }

    if (index < nodes.length - 1 && tokens.length > 0) {
      tokens.push({kind: 'br'});
    }
  });

  if (tokens.length === 0) {
    return undefined;
  }

  return {
    plainText: richTextToPlainText(tokens),
    tokens,
  };
};

const obsidianCalloutPrefixPattern =
  /^(?:note|tip|info|warning|summary|quote|abstract|success|question|fail|danger|bug|example|todo|check|help)(?:\s*[-:]\s*.+)?$/i;
const obsidianCalloutMetaPattern = new RegExp(`^<!--${OBSIDIAN_CALLOUT_META_MARKER}:([^|]*)\\|(.*)-->$`);

const getFirstMeaningfulLine = (nodes: MdNode[]): string => {
  for (const node of nodes) {
    const lines = getNodeText(node)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      return lines[0] ?? '';
    }
  }

  return '';
};

const nodeContainsObsidianCalloutMarker = (node: MdNode): boolean => {
  if (node.type === 'html' && node.value?.includes(OBSIDIAN_CALLOUT_MARKER)) {
    return true;
  }

  return (node.children ?? []).some((child) => nodeContainsObsidianCalloutMarker(child));
};

const isObsidianCalloutBlockquote = (node: MdNode): boolean => {
  if (node.type !== 'blockquote') {
    return false;
  }

  if (nodeContainsObsidianCalloutMarker(node)) {
    return true;
  }

  return obsidianCalloutPrefixPattern.test(getFirstMeaningfulLine(node.children ?? []));
};

const normalizeCalloutType = (value: string): string =>
  value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'note';

const parseObsidianCalloutMeta = (nodes: MdNode[]): {calloutType: string; title: string} | null => {
  for (const node of nodes) {
    if (node.type !== 'html' || !node.value?.includes(OBSIDIAN_CALLOUT_META_MARKER)) {
      continue;
    }

    const match = node.value.match(obsidianCalloutMetaPattern);
    if (!match) {
      continue;
    }

    const calloutType = decodeURIComponent(match[1] ?? '').trim();
    const title = decodeURIComponent(match[2] ?? '').trim();
    if (!title) {
      continue;
    }

    return {
      calloutType: normalizeCalloutType(calloutType || title),
      title,
    };
  }

  return null;
};

const isObsidianCalloutHeaderParagraph = (node: MdNode): boolean => {
  if (node.type !== 'paragraph') {
    return false;
  }

  const children = node.children ?? [];
  const leadingStrong = children[0];
  if (leadingStrong?.type !== 'strong') {
    return false;
  }

  return children.some((child) => child.type === 'html' && child.value?.includes(OBSIDIAN_CALLOUT_MARKER))
    || obsidianCalloutPrefixPattern.test(getNodeText(leadingStrong).trim());
};

const parseLegacyObsidianCalloutHeader = (value: string): {calloutType: string; title: string} => {
  const match = value.match(/^(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      calloutType: normalizeCalloutType(match[1] ?? ''),
      title: (match[2] ?? '').trim(),
    };
  }

  const trimmed = value.trim();
  return {
    calloutType: normalizeCalloutType(trimmed),
    title: trimmed,
  };
};

const getObsidianCalloutHeaderEndIndex = (children: MdNode[]): number => {
  let lastMarkerIndex = -1;

  children.forEach((child, index) => {
    if (child.type === 'html' && child.value?.includes(OBSIDIAN_CALLOUT_MARKER)) {
      lastMarkerIndex = index;
    }
  });

  if (lastMarkerIndex >= 0) {
    return lastMarkerIndex;
  }

  return children.findIndex((child) => child.type === 'strong');
};

const trimLeadingInlineWhitespace = (children: MdNode[]): MdNode[] => {
  const trimmed = children.map((child) => ({...child}));

  while (trimmed.length > 0) {
    const first = trimmed[0];
    if (first?.type !== 'text') {
      break;
    }

    const nextValue = first.value?.replace(/^\s+/, '') ?? '';
    if (nextValue) {
      first.value = nextValue;
      break;
    }

    trimmed.shift();
  }

  return trimmed;
};

const extractObsidianCalloutBodyFromParagraph = (node: MdNode): MdNode[] => {
  const children = node.children ?? [];
  const headerEndIndex = getObsidianCalloutHeaderEndIndex(children);
  if (headerEndIndex < 0) {
    return [];
  }

  const remainingChildren = trimLeadingInlineWhitespace(children.slice(headerEndIndex + 1));
  if (remainingChildren.length === 0) {
    return [];
  }

  return [
    {
      ...node,
      children: remainingChildren,
    },
  ];
};

const extractObsidianCallout = (
  node: MdNode,
): {calloutType: string; title: string; contentNodes: MdNode[]} | null => {
  if (node.type !== 'blockquote' || !isObsidianCalloutBlockquote(node)) {
    return null;
  }

  const children = node.children ?? [];
  const [firstChild, ...rest] = children;
  if (!firstChild || !isObsidianCalloutHeaderParagraph(firstChild)) {
    return null;
  }

  const headerChildren = firstChild.children ?? [];
  const leadingStrong = headerChildren.find((child) => child.type === 'strong');
  if (!leadingStrong) {
    return null;
  }

  const meta = parseObsidianCalloutMeta(headerChildren);
  const fallback = parseLegacyObsidianCalloutHeader(getNodeText(leadingStrong));

  return {
    calloutType: meta?.calloutType ?? fallback.calloutType,
    title: meta?.title ?? fallback.title,
    contentNodes: [...extractObsidianCalloutBodyFromParagraph(firstChild), ...rest],
  };
};

const classifyGenericNodes = (
  sectionNodes: MdNode[],
  consumeThesis: () => boolean,
): NormalizedBlock[] => {
  const blocks: NormalizedBlock[] = [];
  const proseBuffer: MdNode[] = [];

  for (const node of sectionNodes) {
    if (node.type === 'blockquote') {
      flushProse(proseBuffer, blocks);

      const callout = extractObsidianCallout(node);
      if (callout) {
        blocks.push({
          kind: 'callout',
          calloutType: callout.calloutType,
          title: callout.title,
          content: renderNodes(callout.contentNodes),
        });
        continue;
      }

      const contentNodes = node.children ?? [];
      const html = renderNodes(contentNodes);
      const rich = buildRichBlockContent(contentNodes);

      if (consumeThesis()) {
        blocks.push({kind: 'thesis', content: html, rich});
      } else {
        blocks.push({kind: 'docQuote', content: html, rich});
      }
      continue;
    }

    if (node.type === 'code' && node.lang === 'log') {
      flushProse(proseBuffer, blocks);
      blocks.push({
        kind: 'log',
        language: node.lang ?? undefined,
        code: node.value ?? '',
      });
      continue;
    }

    if (isStandaloneImageParagraph(node)) {
      flushProse(proseBuffer, blocks);
      const imageNode = node.children?.[0];
      blocks.push({
        kind: 'image',
        src: imageNode?.url ?? '',
        alt: imageNode?.alt ?? undefined,
      });
      continue;
    }

    proseBuffer.push(node);
  }

  flushProse(proseBuffer, blocks);
  return blocks;
};

const buildSectionBlocks = (
  section: {id: string; title: string; depth: number; anchorId?: string; nodes: MdNode[]},
  consumeThesis: () => boolean,
): NormalizedSection => {
  const childDepth = section.depth + 1;

  if (section.id !== 'lead' && matchAlias('reframe', section.title)) {
    const groups = partitionByChildHeadings(section.nodes, childDepth);
    if (groups.length === 2 && groups.every((group) => group.nodes.length > 0)) {
      return {
        ...section,
        blocks: [
          {
            kind: 'questionReset',
            items: groups.map((group) => ({
              id: String(group.heading.data?.hProperties?.id ?? ''),
              title: getNodeText(group.heading),
              body: renderNodes(group.nodes),
            })),
          },
        ],
      };
    }
  }

  if (section.id !== 'lead' && matchAlias('evidence', section.title)) {
    const groups = partitionByChildHeadings(section.nodes, childDepth);
    if (groups.length >= 2) {
      const items: EvidenceItem[] = groups.map((group) => ({
        id: String(group.heading.data?.hProperties?.id ?? ''),
        title: getNodeText(group.heading),
        body: renderNodes(group.nodes),
        tag: extractEvidenceTag(getNodeText(group.heading)),
      }));

      return {
        ...section,
        blocks: [
          {
            kind: 'evidenceGrid',
            items,
          },
        ],
      };
    }

    if (groups.length === 1) {
      const item = groups[0];
      return {
        ...section,
        blocks: [
          {
            kind: 'evidencePanel',
            item: {
              title: getNodeText(item.heading),
              body: renderNodes(item.nodes),
              tag: extractEvidenceTag(getNodeText(item.heading)),
            },
          },
        ],
      };
    }
  }

  if (section.id !== 'lead' && matchAlias('compare', section.title)) {
    const tableIndex = section.nodes.findIndex((node) => node.type === 'table');
    if (tableIndex >= 0) {
      const before = section.nodes.slice(0, tableIndex);
      const table = section.nodes[tableIndex] as MdNode;
      const after = section.nodes.slice(tableIndex + 1);
      const blocks: NormalizedBlock[] = [];

      flushProse([...before], blocks);
      blocks.push({
        kind: 'axisTable',
        ...markdownTableToAxisData(table),
      });
      flushProse([...after], blocks);

      return {
        ...section,
        blocks,
      };
    }
  }

  return {
    ...section,
    blocks: classifyGenericNodes(section.nodes, consumeThesis),
  };
};

const buildSections = (
  tree: MdRoot,
  baseDepth: number | null,
  documentTitle: string,
  shouldForceLead: boolean,
): Array<{id: string; title: string; depth: number; anchorId?: string; nodes: MdNode[]}> => {
  const sections: Array<{id: string; title: string; depth: number; anchorId?: string; nodes: MdNode[]}> = [];
  const leadNodes: MdNode[] = [];
  let currentSection: {id: string; title: string; depth: number; anchorId?: string; nodes: MdNode[]} | null = null;
  const slugger = new GithubSlugger();
  const headings = tree.children.filter((node) => node.type === 'heading');
  const hasDeeperHeadings =
    baseDepth !== null && headings.some((node) => (node.depth ?? 0) > baseDepth);
  const firstHeadingText = headings.length > 0 ? getNodeText(headings[0] as MdNode) : '';
  const sectionDepth =
    baseDepth !== null && hasDeeperHeadings && firstHeadingText === documentTitle ? baseDepth + 1 : baseDepth;

  for (const node of tree.children) {
    if (
      baseDepth !== null &&
      sectionDepth !== baseDepth &&
      isHeading(node, baseDepth) &&
      getNodeText(node) === documentTitle
    ) {
      continue;
    }

    if (sectionDepth !== null && isHeading(node, sectionDepth)) {
      const title = getNodeText(node);
      const anchorId = String(node.data?.hProperties?.id ?? slugger.slug(title));
      currentSection = {
        id: anchorId,
        title,
        depth: sectionDepth,
        anchorId,
        nodes: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      currentSection.nodes.push(node);
    } else {
      leadNodes.push(node);
    }
  }

  if (leadNodes.length > 0 || sections.length === 0 || shouldForceLead) {
    sections.unshift({
      id: 'lead',
      title: 'Overview',
      depth: sectionDepth ? Math.max(sectionDepth - 1, 0) : 0,
      nodes: leadNodes,
    });
  }

  return sections;
};

const deriveHeadingsFromSections = (
  tree: MdRoot,
): {baseDepth: number | null; items: Array<{id: string; text: string; depth: number; level: number; index: number}>} => {
  const items: Array<{id: string; text: string; depth: number; level: number; index: number}> = [];

  const headingNodes = tree.children.filter((node) => node.type === 'heading');
  const baseDepth = headingNodes.length > 0 ? Math.min(...headingNodes.map((node) => node.depth ?? 0)) : null;

  for (const node of headingNodes) {
    const depth = node.depth ?? 0;
    items.push({
      id: String(node.data?.hProperties?.id ?? ''),
      text: getNodeText(node),
      depth,
      level: baseDepth === null ? 1 : depth - baseDepth + 1,
      index: items.length,
    });
  }

  return {baseDepth, items};
};

export const normalizeDocument = (source: SourceDocument): NormalizedDoc => {
  const tree = parseMarkdown(source.body, {allowMdx: source.filePath.toLowerCase().endsWith('.mdx')});
  annotateHeadingIds(tree);
  const headingInfo = deriveHeadingsFromSections(tree);
  const toc = source.meta.toc === 'none' ? [] : generateToc(headingInfo, source.meta.tocMaxDepth);
  const sections = buildSections(
    tree,
    headingInfo.baseDepth,
    source.meta.title,
    Boolean(source.meta.summary || source.meta.ai),
  );
  let thesisConsumed = false;
  const consumeThesis = (): boolean => {
    if (thesisConsumed || source.meta.summary) {
      return false;
    }

    thesisConsumed = true;
    return true;
  };

  const normalizedSections = sections.map((section) => buildSectionBlocks(section, consumeThesis));
  const lead = normalizedSections[0];
  if (lead) {
    const prefixBlocks: NormalizedBlock[] = [];
    if (source.meta.summary) {
      const summaryTree = parseMarkdown(source.meta.summary);
      prefixBlocks.push({
        kind: 'thesis',
        content: renderNodes(summaryTree.children),
        rich: buildRichBlockContent(summaryTree.children),
      });
    }

    if (source.meta.ai) {
      prefixBlocks.push({
        kind: 'provenance',
        ai: source.meta.ai,
      });
    }

    lead.blocks = [...prefixBlocks, ...lead.blocks];
  }

  return {
    filePath: source.filePath,
    relativePath: source.relativePath,
    sourceRoot: source.sourceRoot,
    sourceDir: source.sourceDir,
    slug: source.meta.slug ?? '',
    meta: source.meta,
    baseDepth: headingInfo.baseDepth,
    headings: toc as TocItem[],
    sections: normalizedSections,
    warnings: source.warnings,
  };
};

export const normalizeVaultSnapshot = (snapshot: VaultSnapshot): {
  sourceDocuments: SourceDocument[];
  normalizedDocuments: NormalizedDoc[];
} => {
  const sourceDocuments = createSourceDocuments(snapshot);
  return {
    sourceDocuments,
    normalizedDocuments: sourceDocuments.map((source) => normalizeDocument(source)),
  };
};

export const getDocumentBySlug = (documents: readonly NormalizedDoc[], slug: string): NormalizedDoc | undefined =>
  documents.find((document) => document.slug === slug);

export const getDocumentsForOutput = (
  documents: readonly NormalizedDoc[],
  output: 'reader' | 'stage' | 'newsletter',
): NormalizedDoc[] => documents.filter((document) => document.meta.outputs.includes(output));
