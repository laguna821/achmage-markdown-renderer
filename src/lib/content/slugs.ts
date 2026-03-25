import path from 'node:path';

const slugPart = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/[_\s/\\]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const flattenRelativePathToSlug = (sourceRoot: string, filePath: string): string => {
  const relativePath = path.relative(sourceRoot, filePath);
  const withoutExtension = relativePath.replace(path.extname(relativePath), '');
  return withoutExtension
    .split(path.sep)
    .map(slugPart)
    .filter(Boolean)
    .join('-');
};

export const normalizeSlug = (value: string): string => slugPart(value);
