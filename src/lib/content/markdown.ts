import {toString} from 'mdast-util-to-string';
import rehypeStringify from 'rehype-stringify';
import GithubSlugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import {unified} from 'unified';
import {visit} from 'unist-util-visit';

import type {InlineToken, MdNode, MdRoot} from './types';

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

const normalizeTextNodeValue = (value?: string): string => value ?? '';

export const extractInlineTokens = (nodes: MdNode[]): InlineToken[] => {
  const tokens: InlineToken[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        const value = normalizeTextNodeValue(node.value);
        if (value) {
          tokens.push({kind: 'text', value});
        }
        break;
      }
      case 'strong':
        tokens.push({kind: 'strong', children: extractInlineTokens(node.children ?? [])});
        break;
      case 'emphasis':
        tokens.push({kind: 'em', children: extractInlineTokens(node.children ?? [])});
        break;
      case 'inlineCode': {
        const value = normalizeTextNodeValue(node.value);
        if (value) {
          tokens.push({kind: 'code', value});
        }
        break;
      }
      case 'link':
        tokens.push({
          kind: 'link',
          href: node.url ?? '',
          children: extractInlineTokens(node.children ?? []),
        });
        break;
      case 'break':
        tokens.push({kind: 'br'});
        break;
      default:
        if (node.children?.length) {
          tokens.push(...extractInlineTokens(node.children));
        } else if (node.value) {
          tokens.push({kind: 'text', value: node.value});
        }
        break;
    }
  }

  return tokens;
};

export const extractInlineTokensFromMarkdown = (markdown: string): InlineToken[] => {
  const tree = parseMarkdown(markdown);
  const tokens: InlineToken[] = [];

  tree.children.forEach((node, index) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      tokens.push(...extractInlineTokens(node.children ?? []));
    } else if (node.type === 'text') {
      tokens.push({kind: 'text', value: normalizeTextNodeValue(node.value)});
    } else if (node.children?.length) {
      tokens.push(...extractInlineTokens(node.children));
    }

    if (index < tree.children.length - 1 && tokens.length > 0) {
      tokens.push({kind: 'br'});
    }
  });

  return tokens;
};
