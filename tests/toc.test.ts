import {describe, expect, test} from 'vitest';

import {collectHeadings, generateToc} from '../src/lib/content/headings';

describe('heading collection', () => {
  test('treats the minimum heading depth as the base TOC level', () => {
    const markdown = `### 강의 주제

본문

#### 관점 전환

#### 사례

##### 세부 사례
`;

    const headings = collectHeadings(markdown);
    const toc = generateToc(headings, 'auto');

    expect(headings.baseDepth).toBe(3);
    expect(toc[0]).toMatchObject({
      text: '강의 주제',
      depth: 3,
      level: 1,
    });
    expect(toc[0]?.children?.[0]).toMatchObject({
      text: '관점 전환',
      depth: 4,
      level: 2,
    });
    expect(toc[0]?.children).toHaveLength(2);
  });

  test('limits toc depth relative to the base depth', () => {
    const markdown = `# Title
## Section
### Child
#### Grandchild`;

    const headings = collectHeadings(markdown);
    const toc = generateToc(headings, 2);

    expect(toc).toHaveLength(1);
    expect(toc[0]?.children).toHaveLength(1);
    expect(toc[0]?.children?.[0]?.children).toBeUndefined();
  });
});
