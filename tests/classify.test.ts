import path from 'node:path';
import {describe, expect, test} from 'vitest';

import {normalizeDocument} from '../src/lib/content/normalize';
import {parseSourceFile} from '../src/lib/content/source';

const fixturesRoot = path.resolve(process.cwd(), 'tests/fixtures');

describe('normalizeDocument', () => {
  test('injects summary thesis and provenance metadata into the lead section', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'ai-provenance.md'),
      raw: `---
title: "AI 리터러시"
docType: "lecture"
outputs: ["reader", "stage"]
summary: "프롬프트보다 먼저, 나만의 맥락을 쌓는 체계가 중요하다."
ai:
  assisted: true
  model: "gemini-3.1-pro"
  generatedAt: "2026-03-07T14:22:00+09:00"
  sourceConfidence: "high"
---

# AI 리터러시

본문
`,
      sourceRoot: fixturesRoot,
    });

    const doc = normalizeDocument(parsed);

    expect(doc.sections[0]?.id).toBe('lead');
    expect(doc.sections[0]?.blocks[0]).toMatchObject({kind: 'thesis'});
    expect(doc.sections[0]?.blocks[1]).toMatchObject({kind: 'provenance'});
  });

  test('classifies reframe, evidence, axis table, log, and quote blocks deterministically', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'lecture-basic.md'),
      raw: `---
title: "AI 리터러시"
docType: "lecture"
outputs: ["reader", "stage"]
---

# AI 리터러시

> 프롬프트보다 먼저, 나만의 맥락을 쌓는 지식 관리 체계가 중요하다.

## 관점 전환

### 잘못된 질문
이 영화에 쓰인 이미지 프롬프트는 무엇인가?

### 다시 세운 질문
왜 어떤 사람은 같은 도구를 써도 더 밀도 높은 결과를 만드는가?

## 현장 노트

### FIELD NOTE #01
첫 번째 사례

### FIELD NOTE #02
두 번째 사례

## 비교

앞 문장

| 비교 축 | 도구 중심 접근 | 맥락 중심 접근 |
| --- | --- | --- |
| 질문 | 어떤 툴을 썼나 | 어떤 삶과 축적이 있었나 |

뒤 문장

## 실행 로그

\`\`\`log
vault -> parse -> classify -> render -> publish
\`\`\`

## 인용

> 일반 인용문
`,
      sourceRoot: fixturesRoot,
    });

    const doc = normalizeDocument(parsed);
    const kinds = doc.sections.flatMap((section) => section.blocks.map((block) => block.kind));

    expect(kinds).toContain('thesis');
    expect(kinds).toContain('questionReset');
    expect(kinds).toContain('evidenceGrid');
    expect(kinds).toContain('axisTable');
    expect(kinds).toContain('log');
    expect(kinds).toContain('docQuote');
  });

  test('falls back to prose when question reset section has more than two child headings', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'question-reset-fallback.md'),
      raw: `---
title: "Fallback"
docType: "lecture"
outputs: ["reader"]
---

## 관점 전환

### 하나
본문

### 둘
본문

### 셋
본문
`,
      sourceRoot: fixturesRoot,
    });

    const doc = normalizeDocument(parsed);
    const section = doc.sections.find((entry) => entry.title === '관점 전환');

    expect(section?.blocks).toHaveLength(1);
    expect(section?.blocks[0]).toMatchObject({kind: 'prose'});
  });

  test('uses a lead section when there are no headings', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'no-headings.md'),
      raw: `---
title: "No Headings"
docType: "note"
outputs: ["reader"]
summary: "heading이 없어도 lead section으로 렌더링된다."
---

문단만 있는 문서.
`,
      sourceRoot: fixturesRoot,
    });

    const doc = normalizeDocument(parsed);

    expect(doc.baseDepth).toBeNull();
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]?.id).toBe('lead');
  });

  test('renders single evidence sections as an evidence panel', () => {
    const parsed = parseSourceFile({
      filePath: path.join(fixturesRoot, 'evidence-single.md'),
      raw: `---
title: "Single Evidence"
docType: "note"
outputs: ["reader"]
---

# Single Evidence

## 현장 노트

### FIELD NOTE #01
사례 하나만 있는 문서
`,
      sourceRoot: fixturesRoot,
    });

    const doc = normalizeDocument(parsed);
    const evidenceSection = doc.sections.find((entry) => entry.title === '현장 노트');

    expect(evidenceSection?.blocks[0]).toMatchObject({kind: 'evidencePanel'});
  });
});
