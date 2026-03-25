import GithubSlugger from 'github-slugger';

import {extractEvidenceTag, matchAlias} from './aliases';
import {resolveAssetUrl} from './assets';
import {generateToc} from './headings';
import {annotateHeadingIds, getNodeText, parseMarkdown, renderInlineNodes, renderNodes} from './markdown';
import {loadSourceDocuments} from './source';
import type {
  EvidenceItem,
  MdNode,
  MdRoot,
  NormalizedBlock,
  NormalizedDoc,
  NormalizedSection,
  SourceDocument,
  TocItem,
} from './types';

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

const classifyGenericNodes = (
  sectionNodes: MdNode[],
  source: SourceDocument,
  consumeThesis: () => boolean,
): NormalizedBlock[] => {
  const blocks: NormalizedBlock[] = [];
  const proseBuffer: MdNode[] = [];

  for (const node of sectionNodes) {
    if (node.type === 'blockquote') {
      flushProse(proseBuffer, blocks);
      const html = renderNodes([node]);

      if (consumeThesis()) {
        blocks.push({kind: 'thesis', content: html});
      } else {
        blocks.push({kind: 'docQuote', content: html});
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
      const src = imageNode?.url ? resolveAssetUrl(source, imageNode.url) : '';
      blocks.push({
        kind: 'image',
        src,
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
  source: SourceDocument,
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
    blocks: classifyGenericNodes(section.nodes, source, consumeThesis),
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

  const normalizedSections = sections.map((section) => buildSectionBlocks(section, source, consumeThesis));
  const lead = normalizedSections[0];
  if (lead) {
    const prefixBlocks: NormalizedBlock[] = [];
    if (source.meta.summary) {
      prefixBlocks.push({
        kind: 'thesis',
        content: `<p>${source.meta.summary}</p>`,
      });
      thesisConsumed = true;
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
    slug: source.meta.slug ?? '',
    meta: source.meta,
    baseDepth: headingInfo.baseDepth,
    headings: toc as TocItem[],
    sections: normalizedSections,
    warnings: source.warnings,
  };
};

let cachedDocs: NormalizedDoc[] | null = null;

export const clearNormalizedCache = (): void => {
  cachedDocs = null;
};

export const loadNormalizedDocuments = (): NormalizedDoc[] => {
  if (cachedDocs) {
    return cachedDocs;
  }

  cachedDocs = loadSourceDocuments().map((source) => normalizeDocument(source));
  return cachedDocs;
};

export const getDocumentBySlug = (slug: string): NormalizedDoc | undefined =>
  loadNormalizedDocuments().find((document) => document.slug === slug);

export const getDocumentsForOutput = (output: 'reader' | 'stage' | 'newsletter'): NormalizedDoc[] =>
  loadNormalizedDocuments().filter((document) => document.meta.outputs.includes(output));
