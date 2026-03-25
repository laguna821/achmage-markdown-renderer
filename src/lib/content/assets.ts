import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';

import {flattenRelativePathToSlug} from './slugs';
import type {SourceDocument} from './types';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const DOC_ASSET_DIR = path.join(PUBLIC_DIR, '_doc-assets');

const isRemoteAsset = (url: string): boolean =>
  /^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('/');

export const resolveAssetUrl = (source: SourceDocument, assetPath: string): string => {
  if (isRemoteAsset(assetPath)) {
    return assetPath;
  }

  let absoluteSource = path.resolve(source.sourceDir, assetPath);
  if (!fs.existsSync(absoluteSource)) {
    const matches = fg.sync(`**/${path.basename(assetPath)}`, {
      cwd: source.sourceRoot,
      absolute: true,
      onlyFiles: true,
      caseSensitiveMatch: false,
    });

    if (matches.length > 0) {
      absoluteSource = matches[0];
    }
  }

  if (!fs.existsSync(absoluteSource)) {
    source.warnings.push(`Asset not found: ${assetPath}`);
    return assetPath;
  }

  fs.mkdirSync(DOC_ASSET_DIR, {recursive: true});

  const flattened = flattenRelativePathToSlug(source.sourceRoot, absoluteSource);
  const extension = path.extname(absoluteSource);
  const fileName = extension ? `${flattened}${extension}` : flattened;
  const targetPath = path.join(DOC_ASSET_DIR, fileName);

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).mtimeMs < fs.statSync(absoluteSource).mtimeMs) {
    fs.copyFileSync(absoluteSource, targetPath);
  }

  return `/_doc-assets/${fileName}`;
};
