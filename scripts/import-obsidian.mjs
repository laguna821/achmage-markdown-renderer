import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = process.env.DOC_WORKSPACE_CONTENT_DIR;
const targetRoot = path.resolve(process.cwd(), 'src/content/docs');

if (!sourceRoot) {
  console.error('DOC_WORKSPACE_CONTENT_DIR is required.');
  process.exit(1);
}

const copyRecursive = (from, to) => {
  fs.mkdirSync(to, {recursive: true});
  for (const entry of fs.readdirSync(from, {withFileTypes: true})) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(sourcePath, targetPath);
      continue;
    }

    if (!/\.(md|mdx|png|jpe?g|gif|svg|webp)$/i.test(entry.name)) {
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
};

copyRecursive(path.resolve(sourceRoot), targetRoot);
console.log(`Imported markdown content from ${sourceRoot} to ${targetRoot}`);
