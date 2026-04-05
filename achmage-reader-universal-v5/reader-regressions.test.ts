import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');

const readSource = (...segments: string[]) =>
  readFileSync(path.join(rootDir, ...segments), 'utf8').replace(/\r\n/g, '\n');

describe('reader regressions', () => {
  it('keeps the ToC sync effect aligned with SPA output changes and mobile reveal events', () => {
    const source = readSource('components', 'DocumentView.tsx');

    expect(source).toContain("window.addEventListener('toc:reveal-active'");
    expect(source).toContain("window.removeEventListener('toc:reveal-active'");
    expect(source).toContain("window.dispatchEvent(new Event('toc:reveal-active'))");
    expect(source).toMatch(
      /const tocLinks = Array\.from\(document\.querySelectorAll<HTMLAnchorElement>\('\[data-toc-item\]'\)\);[\s\S]*?\}, \[doc(?:\.headings)?, doc\.slug, output\]\);/,
    );
  });

  it('keeps code blocks free of inline code highlight fills in prose and log blocks', () => {
    const proseCss = readSource('styles', 'prose.css');
    const blocksCss = readSource('styles', 'blocks.css');

    expect(proseCss).toContain(":root[data-theme='dark'] .prose-block pre > code");
    expect(proseCss).toContain(":root[data-theme='light'] .prose-block pre > code");
    expect(blocksCss).toContain('.log-block pre > code');
  });
});
