---
title: "Cyber Sanctuary Protocol"
docType: "note"
outputs: ["reader", "stage"]
theme: "cyber_sanctuary"
summary: "사이버 생추어리 테마 우선순위와 렌더 분위기를 검증하기 위한 샘플 문서."
author: "안창현"
date: "2026-04-02"
tags: ["theme", "cyber", "render"]
heroLabel: "Stable Release"
---

# Cyber Sanctuary Protocol

> 렌더링된 화면이 샘플의 공기를 닮지 못하면, 이 테마는 성공한 것이 아니다.

## Primary Shell

사이버 생추어리 테마는 깊은 우주 배경과 유리 패널, 그리고 보라·청록·핑크 계열의 네온 포인트를 기본 문법으로 사용한다.

```ts
const resolveSanctuaryMode = () => ({
  atmosphere: 'void-glass',
  glow: ['violet', 'cyan', 'pink'],
  priority: 'rendered-first',
});
```

## Visual Rules

- 카드와 패널은 과하게 시끄럽지 않아야 한다.
- 긴 본문은 높은 대비와 안정된 줄간격을 유지해야 한다.
- 강조 요소는 네온 포인트로 충분히 살아나야 한다.
