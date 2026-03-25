import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

import {parseSourceFile, resolveContentRoot} from '../src/lib/content/source';

const fixturesRoot = path.resolve(process.cwd(), 'tests/fixtures');

describe('parseSourceFile', () => {
  test('derives slug from the relative path when frontmatter omits it', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'nested', 'lecture-starts-at-h3.md'),
      raw: `---
title: "Nested Lecture"
docType: "lecture"
outputs: ["reader", "stage"]
---

### 시작
본문
`,
      sourceRoot: fixturesRoot,
    });

    expect(parsed.meta.slug).toBe('nested-lecture-starts-at-h3');
  });

  test('preserves unicode characters in inferred slugs to avoid collisions', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, '403. AI and Design', 'Achmage Universal Agentic Frontend Workflow v2 실전 예시 데모.md'),
      raw: '# Demo',
      sourceRoot: fixturesRoot,
    });

    expect(parsed.meta.slug).toContain('실전-예시-데모');
  });

  test('rejects files missing required frontmatter fields', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, '402. Teaching Materials', 'sample-lecture.md'),
      raw: `---
tags:
  - lecture
---

# Sample Lecture

본문`,
      sourceRoot: fixturesRoot,
    });

    expect(parsed.meta.title).toBe('Sample Lecture');
    expect(parsed.meta.docType).toBe('lecture');
    expect(parsed.meta.outputs).toEqual(['reader', 'stage']);
  });
});

describe('resolveContentRoot', () => {
  test('prefers a local content-root file when env var is absent', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'md-workspace-root-'));
    const docsDir = path.join(tempRoot, '40. Meaning (M)');
    const configPath = path.join(tempRoot, '.doc-workspace-content-dir');

    fs.mkdirSync(docsDir, {recursive: true});
    fs.writeFileSync(configPath, '40. Meaning (M)\n', 'utf8');

    const originalCwd = process.cwd();
    const originalEnv = process.env.DOC_WORKSPACE_CONTENT_DIR;

    try {
      delete process.env.DOC_WORKSPACE_CONTENT_DIR;
      process.chdir(tempRoot);

      expect(resolveContentRoot()).toBe(docsDir);
    } finally {
      process.chdir(originalCwd);
      if (originalEnv === undefined) {
        delete process.env.DOC_WORKSPACE_CONTENT_DIR;
      } else {
        process.env.DOC_WORKSPACE_CONTENT_DIR = originalEnv;
      }

      fs.rmSync(tempRoot, {recursive: true, force: true});
    }
  });
});
