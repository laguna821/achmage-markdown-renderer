import {getExtension, normalizePathSeparators, stripExtension} from './path-utils';

const slugPart = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/[_\s/\\]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const flattenRelativePathToSlug = (relativePath: string): string => {
  const normalized = normalizePathSeparators(relativePath);
  const withoutExtension = getExtension(normalized) ? stripExtension(normalized) : normalized;
  return withoutExtension
    .split('/')
    .map(slugPart)
    .filter(Boolean)
    .join('-');
};

export const normalizeSlug = (value: string): string => slugPart(value);
