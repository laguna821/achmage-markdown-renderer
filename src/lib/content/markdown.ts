import {toString} from 'mdast-util-to-string';
import rehypeStringify from 'rehype-stringify';
import GithubSlugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import {unified} from 'unified';
import {visit} from 'unist-util-visit';

import type {MdNode, MdRoot} from './types';

const markdownParser = unified().use(remarkParse).use(remarkGfm);
const mdxParser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
const renderer = unified().use(remarkRehype).use(rehypeStringify);

export const parseMarkdown = (markdown: string, options?: {allowMdx?: boolean}): MdRoot =>
  (options?.allowMdx ? mdxParser : markdownParser).parse(markdown) as MdRoot;

export const annotateHeadingIds = (tree: MdRoot): void => {
  const slugger = new GithubSlugger();

  visit(tree as never, 'heading', (node: MdNode) => {
    const id = slugger.slug(getNodeText(node));
    node.data ??= {};
    node.data.hProperties ??= {};
    node.data.hProperties.id = id;
  });
};

export const renderNodes = (nodes: MdNode[]): string => {
  const tree: MdRoot = {
    type: 'root',
    children: nodes,
  };
  const hast = renderer.runSync(tree as never);
  return String(renderer.stringify(hast));
};

export const renderInlineNodes = (nodes: MdNode[]): string =>
  renderNodes([
    {
      type: 'paragraph',
      children: nodes,
    },
  ])
    .replace(/^<p>/, '')
    .replace(/<\/p>\s*$/, '');

export const getNodeText = (node: MdNode): string => toString(node as never);
