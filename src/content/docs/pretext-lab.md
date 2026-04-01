---
title: "프리텍스트 기반 문서 레이아웃 엔진이 긴 한국어 제목과 Mixed English Phrase를 동시에 더 안정적으로 다루는지 검증하는 실험 문서"
docType: "lecture"
outputs: ["reader", "stage"]
summary: "아주 긴 제목, 비교적 긴 thesis, 그리고 카드형 사례 블록을 한 문서에 넣어도 Reader와 Stage에서 줄 배치와 첫 화면 밀도가 무너지지 않는지 확인한다."
author: "안창현"
date: "2026-04-01"
tags: ["pretext", "layout", "qa"]
toc: "auto"
heroLabel: "Pretext Lab"
---

# 프리텍스트 기반 문서 레이아웃 엔진이 긴 한국어 제목과 Mixed English Phrase를 동시에 더 안정적으로 다루는지 검증하는 실험 문서

> 짧은 요약이 아니라 어느 정도 길이가 있는 thesis가 들어와도, 핵심 주장 박스가 읽기 좋은 폭과 줄 수를 유지하는지를 관찰하기 위한 실험용 문장이다.

## 관점 전환

### 지금의 질문
우리는 왜 Markdown 구조 해석 엔진과 텍스트 줄 배치 엔진을 하나의 책임으로 묶어 보려 하는가?

### 다시 세운 질문
의미 해석과 줄 배치를 분리했을 때, 실제 문서 품질과 유지보수성이 얼마나 더 좋아지는가?

## 현장 노트

### FIELD NOTE #01
첫 번째 카드는 비교적 짧은 본문을 갖고 있어 균형이 빠르게 잡혀야 한다.

### FIELD NOTE #02
두 번째 카드는 본문 길이가 조금 더 길어서 동일한 breakpoint에서도 실제 줄 수 기준으로 높이 편차가 생길 수 있다.

### FIELD NOTE #03
세 번째 카드는 짧지만, 제목의 길이와 태그 유무 때문에 카드 외형 높이에 미세한 차이가 생긴다.

### FIELD NOTE #04
네 번째 카드는 조금 더 장문으로 작성해 두어 2열과 3열 중 어느 배치가 더 안정적인지 휴리스틱이 고를 수 있게 한다.

## 인용

> Meaning is structured by the author, but line breaks are where the reading surface either holds together or starts to feel brittle.
