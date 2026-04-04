import GithubSlugger from 'github-slugger';
import {visit} from 'unist-util-visit';

import {annotateHeadingIds, getNodeText, parseMarkdown} from './markdown';
import type {HeadingCollection, HeadingRecord, MdNode, MdRoot, TocDepthOption, TocItem} from './types';

const collectHeadingNodes = (tree: MdRoot): HeadingRecord[] => {
  const slugger = new GithubSlugger();
  const headings: HeadingRecord[] = [];

  visit(tree as never, 'heading', (node: MdNode) => {
    const depth = node.depth ?? 0;
    const text = getNodeText(node);
    const id = String(node.data?.hProperties?.id ?? slugger.slug(text));
    headings.push({
      id,
      text,
      depth,
      index: headings.length,
      level: 0,
    });
  });

  const baseDepth = headings.length > 0 ? Math.min(...headings.map((heading) => heading.depth)) : null;

  return headings.map((heading) => ({
    ...heading,
    level: baseDepth === null ? 1 : heading.depth - baseDepth + 1,
  }));
};

export const collectHeadings = (markdown: string): HeadingCollection => {
  const tree = parseMarkdown(markdown);
  annotateHeadingIds(tree);
  const items = collectHeadingNodes(tree);
  const baseDepth = items.length > 0 ? Math.min(...items.map((heading) => heading.depth)) : null;
  return {baseDepth, items};
};

export const generateToc = (headings: HeadingCollection, tocMaxDepth: TocDepthOption): TocItem[] => {
  if (headings.baseDepth === null) {
    return [];
  }

  const maxLevel = tocMaxDepth === 'auto' ? 2 : tocMaxDepth;
  const eligible = headings.items.filter((heading) => heading.level <= maxLevel);
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of eligible) {
    const item: TocItem = {
      text: heading.text,
      slug: heading.id,
      depth: heading.depth,
      level: heading.level,
    };

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= item.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children ??= [];
      parent.children.push(item);
    } else {
      root.push(item);
    }

    stack.push(item);
  }

  return root;
};

export const getHeadingIdsInDocumentOrder = (markdown: string): string[] => collectHeadings(markdown).items.map((item) => item.id);
