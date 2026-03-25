
# PRD — Markdown Source-of-Truth Document Workspace System
## 부제
Obsidian Markdown를 원본으로 삼아, 강의/발표/뉴스레터/읽기 화면을 자동으로 만드는 스크롤형 문서 엔진

---

## 0. 문서 정보

- **문서명**: Markdown Source-of-Truth Document Workspace System PRD
- **목적**: Codex가 추가 설명 없이도 바로 구현에 들어갈 수 있도록, 문제 정의부터 제품 방향, 문서 규칙, 렌더링 규칙, 기술 구조, 수용 기준까지 한 번에 이해할 수 있는 상세 설계 문서 제공
- **문서 상태**: V1 제안안
- **핵심 원칙**: Markdown이 원본이다. 출력은 여러 껍데기다.
- **핵심 성격**: 블로그가 아니라 **문서 작업 공간(Document Workspace)**, 슬라이드 제작기가 아니라 **문서 컴파일 엔진**

---

## 1. 한 줄 요약

이 제품은 **Obsidian에서 쓴 Markdown 파일을 그대로 넣으면**, 별도의 HTML 수작업이나 AI 후처리 없이도,  
교수자/연구자 스타일의 **세로 스크롤형 강의 뷰어, 발표 모드, 뉴스레터 레이아웃**으로 자동 렌더링하는 **Astro 기반 정적 문서 시스템**이다.

이 시스템의 핵심은 단순히 “Markdown을 웹에 띄우는 것”이 아니라,  
**논지의 뼈대, 근거, 비교축, AI 개입 기록, 목차, 발표 흐름**을 UI 규칙으로 고정하는 데 있다.

---

## 2. 왜 이 제품을 만드는가

### 2.1 현재 문제
사용자는 이미 Markdown 중심 글쓰기 흐름에 큰 장점을 느끼고 있다.  
특히 Obsidian 기반 글쓰기에서 다음 문제가 반복된다.

1. 글의 원본은 Markdown인데,  
   발표나 배포를 위해 다시 HTML/PPT/PDF로 별도 가공하는 시간이 든다.
2. AI에게 “이 Markdown을 HTML PPT로 바꿔줘”라고 매번 부탁하는 시간조차 낭비다.
3. 발표용 자료와 배포용 자료와 보관용 자료가 서로 다른 파일로 갈라지면,  
   수정 지점이 늘어나고 내용이 어긋난다.
4. 기존 PPT/PDF는 기본적으로 가로 넘김 중심인데,  
   실제 학생과 독자는 모바일에서 세로 스크롤로 자료를 읽는 경우가 많다.
5. 지금까지 만든 HTML 프로토타입은 방향은 좋지만,  
   수작업 HTML이라 재사용성과 자동화 수준이 낮다.

### 2.2 이미 확인된 작업 가설
사용자는 이미 다음 경험을 통해 방향성을 확인했다.

- Markdown 원본 하나에 집중할수록 작업 효율이 크게 오른다.
- HWPX/DOCX 쪽은 이미 Obsidian 플러그인으로 정리해 두었고,  
  그 결과 “문서 변환 걱정”이 줄어들자 글쓰기 집중도가 크게 올랐다.
- 같은 철학을 웹 문서/발표 뷰어로 확장하면,  
  앞으로는 PPTX나 HTML PPT 자체를 만들기 위해 프롬프트를 타이핑하는 시간도 지울 수 있다.
- 강의/발표/읽기/배포가 모두 세로 스크롤 문서로 통합될 수 있다면,  
  “글쓰기 올인원”에 가까운 작업 체계를 만들 수 있다.

### 2.3 제품이 해결해야 하는 진짜 문제
이 제품의 목표는 “Markdown을 예쁘게 보여주는 웹사이트”가 아니다.  
진짜 목표는 다음이다.

> **글쓰기 원본을 하나로 통일하고,  
> 그 원본을 여러 출력 화면으로 자동 컴파일하며,  
> 사용자의 사고 방식 자체를 디자인 시스템으로 굳히는 것.**

---

## 3. 제품 비전

### 3.1 비전 문장
**Markdown을 원본으로 삼아, 강의·발표·뉴스레터·문서 배포를 하나의 문서 체계로 통합한다.**

### 3.2 제품의 정체성
이 제품은 아래 네 가지를 동시에 만족해야 한다.

1. **원본 중심**  
   모든 시작은 Markdown 파일이다. HTML은 결과물일 뿐이다.

2. **세로 스크롤 중심**  
   가로 슬라이드보다 긴 흐름, 모바일 읽기, 문서형 발표에 더 잘 맞는 구조를 기본값으로 둔다.

3. **논증형 UI**  
   예쁜 카드보다 주장, 근거, 비교, 기록이 보이는 구조를 우선한다.

4. **AI 기록 노출**  
   AI는 마법처럼 꾸미는 대상이 아니라, 개입 기록과 검토 대상이라는 사실이 드러나야 한다.

---

## 4. 기존 프로토타입에서 추출한 디자인 철학

현재 확보된 HTML 프로토타입들에서 반복적으로 보이는 패턴은 다음과 같다.

### 4.1 공통 뼈대
- 왼쪽 레일: 목차, 메타정보, 현재 위치 안내
- 오른쪽 본문: 긴 문서를 끊지 않고 이어서 읽는 구조
- 섹션 중심 흐름: 주장 → 전환 → 근거 → 비교 → 결론
- 전체 문서가 하나의 스크롤 흐름으로 이어짐

### 4.2 공통 시각 원칙
- 화려한 장식보다 선, 표, 경계, 위계가 먼저 보임
- 카드 남발보다 표와 리스트와 레일을 우선
- 둥근 모서리와 흐린 그림자보다 낮은 반경, 단단한 경계, 하드 섀도우
- 여백은 충분하되 정보 밀도는 유지
- AI 영역은 반짝이는 마법 UI가 아니라 기록 패널과 라벨로 표시

### 4.3 반복되는 핵심 UI 패턴
1. **Thesis Bar**  
   문서의 핵심 주장이나 목표를 큰 덩어리로 먼저 제시

2. **Question Reset Block / Reframe Block**  
   잘못된 질문 vs 다시 세운 질문을 좌우 대조 구조로 보여줌

3. **Evidence Panel / Field Note**  
   주장에 붙는 관찰, 사례, 현장 노트, 실증 블록

4. **Axis Compare Table**  
   단순 카드가 아니라 비교축을 표로 정리

5. **Doc Quote / Quote Block**  
   강조 문장이나 핵심 전제를 본문과 구분

6. **Execution Log / Code Block**  
   절차, 작업 흐름, 명령형 사고를 드러냄

7. **AI Provenance Panel**  
   AI 생성/요약/수정 사실, 모델, 날짜, 신뢰도, 원문 복원 같은 메타 기록 노출

### 4.4 제품이 지켜야 할 미학
- “예쁜 화면”보다 “생각의 뼈대가 보이는 화면”
- “마케팅 랜딩 페이지”보다 “작업과 검토를 위한 문서 공간”
- “AI가 멋져 보이는 화면”보다 “AI가 개입했다는 사실이 보이는 화면”

---

## 5. 제품 목표

## 5.1 핵심 목표
1. 사용자는 **Markdown 파일만 작성**하면 된다.
2. 사용자는 별도 HTML/PPT 수작업 없이 **자동으로 웹 문서**를 얻는다.
3. 같은 Markdown 원본 하나로 **Reader / Stage / Newsletter** 같은 여러 출력을 만든다.
4. heading만 제대로 써도 **목차, 앵커, 현재 위치 표시**가 자동 생성된다.
5. Markdown 표, 인용문, 코드블록, 섹션 구조를 활용해 **최소한의 시각화 요소**가 자동 렌더링된다.
6. 일정한 문서 규칙을 따르면, Thesis / Evidence / Compare / Provenance 같은 블록이 **규칙 기반으로 자동 승격**된다.
7. 이 과정에는 **AI 후처리**가 필요 없다. 전부 빌드 단계 규칙 처리로 끝나야 한다.

## 5.2 성공 조건
- 사용자가 “이 Markdown을 HTML PPT로 바꿔줘”라고 AI에게 부탁하는 일이 크게 줄어든다.
- 사용자가 문서 원본은 Markdown 한 군데만 관리한다.
- 발표, 읽기, 배포가 모두 한 원본에서 일관되게 나온다.
- 모바일에서도 읽기 편한 세로 스크롤 문서가 된다.
- Markdown에만 집중하는 작업 흐름이 더 강해진다.

---

## 6. 비목표(처음부터 하지 않을 것)

다음은 V1에서 하지 않거나, 최소한 뒤로 미룬다.

1. 일반 사용자용 범용 웹사이트 빌더
2. 실시간 협업 편집기
3. 무거운 CMS
4. DB 기반 동적 콘텐츠 시스템
5. 로그인/권한 관리
6. 아무 표시 없는 자유 산문을 100% 정확하게 의미 분류하는 AI 추론 시스템
7. 모든 복잡한 레이아웃을 순수 CommonMark만으로 해결하려는 집착
8. 전통 PPT를 완전히 없애는 목표
9. 카드형 SaaS UI나 랜딩 페이지형 화려한 장식 추구
10. 수작업 TOC 작성

---

## 7. 사용자와 사용 상황

## 7.1 1차 사용자
### 교수자 / 연구자 / 지식 노동자
- Obsidian 또는 로컬 Markdown 기반으로 글을 쓴다.
- 긴 글, 강의안, 뉴스레터, 연구 메모, 발표 문서를 자주 만든다.
- 내용은 자주 고치지만, 형식 변환에 시간을 쓰고 싶지 않다.
- 모바일 읽기와 발표용 화면을 동시에 해결하고 싶다.

## 7.2 2차 사용자
### 학생 / 수강자 / 독자
- PDF/PPT보다 웹 문서를 더 쉽게 읽을 수 있다.
- 특히 모바일에서 세로 스크롤로 자료를 본다.
- 긴 흐름의 강의 자료를 한 화면씩 넘기기보다 자연스럽게 따라간다.

## 7.3 3차 사용자
### 구현 담당 에이전트(Codex)
- 프로젝트 맥락 설명 없이도 요구 사항을 이해해야 한다.
- “무엇을 만들어야 하는지”뿐 아니라 “왜 그렇게 만들어야 하는지”도 알아야 한다.
- 설계 규칙과 예외 처리 기준을 문서에서 바로 읽고 구현 가능해야 한다.

---

## 8. 핵심 제품 개념

## 8.1 한 원본, 여러 출력
이 시스템의 가장 중요한 개념은 다음이다.

```text
Obsidian Markdown 원본
├─ Reader View
├─ Stage View
├─ Newsletter View
├─ Handout / Print View (선택)
└─ 추후 다른 출력 형식
```

즉, Markdown 파일이 **진짜 원본(Source of Truth)** 이다.  
나머지는 이 원본을 어떤 껍데기로 보여줄지에 대한 렌더링 결과다.

## 8.2 Markdown 뷰어가 아니라 Markdown 컴파일러
이 제품은 단순한 뷰어가 아니다.  
원하는 동작은 아래와 같다.

```text
Markdown 파일
-> 파싱
-> 규칙 기반 의미 판별
-> 정규화된 문서 구조(JSON/AST)
-> 디자인 시스템 컴포넌트에 매핑
-> Reader / Stage / Newsletter 결과 출력
```

즉, 문서 원본을 그냥 찍어내는 것이 아니라  
**문서의 구조를 읽어서 UI 구조로 변환하는 컴파일러**에 가깝다.

---

## 9. 제품 원칙

1. **Markdown First**  
   콘텐츠 작성은 Markdown에서 끝나야 한다.

2. **Plain Markdown First**  
   처음부터 복잡한 확장 문법을 강요하지 않는다.  
   먼저 기본 Markdown + frontmatter + 간단한 섹션 규칙으로 최대한 멀리 간다.

3. **Deterministic, Not AI**  
   렌더링 규칙은 예측 가능해야 한다.  
   사용자는 “왜 이렇게 렌더링됐는지”를 이해할 수 있어야 한다.

4. **Structure Over Decoration**  
   구조, 표, 위계, 경계가 먼저다.

5. **Scroll First**  
   세로 스크롤이 기본 경험이다.

6. **Mode Separation**  
   Reader와 Stage는 같은 원본을 쓰되, 같은 화면을 억지로 공유하지 않는다.

7. **Graceful Fallback**  
   규칙에 맞지 않는 내용은 절대 깨지지 말고, 그냥 일반 본문으로 자연스럽게 떨어져야 한다.

---

## 10. 출력 모드 정의

## 10.1 Reader Mode
### 목적
긴 글 읽기, 배포, 복습, 아카이브

### 특징
- 밝은 테마 기본
- 왼쪽 TOC 레일
- 메타정보 노출
- 본문 가독성 우선
- Evidence, 표, 인용, 로그를 모두 충분히 펼침
- 모바일에서 위/아래 스크롤에 최적화

### 쓰임
- 학생 배포용 강의 자료
- 연구 문서
- 읽기용 뉴스레터
- 아카이브용 문서

## 10.2 Stage Mode
### 목적
발표, 강의, Zoom 수업, 스크린 공유

### 특징
- 어두운 테마 허용
- 더 큰 글자와 섹션 강조
- 현재 섹션 중심
- 키보드로 다음 섹션 이동 가능
- 현재 읽는 위치를 시각적으로 강하게 표시
- 필요하면 리스트 순차 공개 가능
- 여전히 문서는 세로 스크롤 전체를 유지하지만, 발표 흐름 제어 기능을 추가

### 쓰임
- 라이브 강연
- 온라인 강의
- 세미나 발표

## 10.3 Newsletter Mode
### 목적
주간 정리, 배포형 요약, 커뮤니티 업데이트

### 특징
- Reader보다 조금 더 좁은 본문 폭
- 섹션 분리와 요약 헤더가 더 강함
- 날짜/주차/카테고리 라벨 강조
- 카드형 광고 랜딩이 아니라 문서형 뉴스레터

---

## 11. 소스 문서 모델

## 11.1 기본 원칙
문서는 세 층으로 구성한다.

1. **본문 Markdown**
2. **Frontmatter**
3. **선택적 확장 규칙**

## 11.2 작성 비율 원칙
- 70~80%: 순수 Markdown
- 15~25%: frontmatter
- 0~10%: 선택적 확장 문법 또는 directive/MDX (후순위)

## 11.3 원본 파일 형식
- `.md` 기본
- `.mdx`는 예외적 탈출구로 허용
- V1에서 기본 저작 경험은 `.md` 중심

---

## 12. Frontmatter 계약(Authoring Contract)

아래는 권장 기본 schema다.

```yaml
---
title: "AI 리터러시: 콘텐츠에 최적화된 시청자의 몰입을 만드는 법"
slug: "ai-literacy-prom-3-7"
docType: "lecture"          # lecture | newsletter | note | handout
outputs: ["reader", "stage"]
theme: "light"              # light | dark | auto
author: "안창현"
date: "2026-03-07"
tags: ["AI", "PKM", "Context_Engineering"]

summary: "AI 시대의 핵심 경쟁력은 프롬프트가 아니라 축적된 맥락이다."
heroLabel: "Lecture Series: PROM 3-7"

toc: "auto"                 # auto | manual | none
tocMaxDepth: "auto"         # auto | 1 | 2 | 3
tocTitle: "TABLE_OF_CONTENTS"

stage:
  enabled: true
  focusMode: true
  keyboardNav: true
  revealLists: false

ai:
  assisted: true
  model: "gemini-3.1-pro"
  generatedAt: "2026-03-07T14:22:00+09:00"
  sourceConfidence: "high"
  basedOn: ["principles.md", "notes/prom-3-7.md"]

rail:
  showMetadata: true
  showTags: true
  showToc: true
---
```

## 12.1 필수 필드
- `title`
- `docType`
- `outputs`

## 12.2 강력 권장 필드
- `slug`
- `date`
- `tags`
- `summary`
- `toc`
- `ai`

## 12.3 schema 검증 목적
- 내용 누락 방지
- URL 일관성 보장
- 렌더링 모드 자동 선택
- Stage/Reader 동작 차이 분리
- Provenance 패널 자동 생성

---

## 13. 핵심 UX 규칙

## 13.1 TOC는 절대 수작업으로 중복 작성하지 않는다
- TOC는 heading에서 자동 생성
- heading과 TOC를 따로 적게 만들지 않는다
- 수작업 TOC가 본문과 어긋나는 일을 원천 차단한다

## 13.2 사용자는 글만 쓴다
- HTML 쓰지 않음
- 클래스명 쓰지 않음
- 컴포넌트 호출 최소화
- 대부분은 제목, 목록, 표, 인용, 코드블록, 구분선만으로 작성

## 13.3 구조 신호가 있어야 의미 블록이 된다
시스템은 AI 추론이 아니라 **규칙 기반**으로 동작한다.  
따라서 무신호 자유 산문을 매번 똑똑하게 이해하는 것이 아니라,  
일정한 문서 규칙을 따르면 자동으로 더 좋은 렌더링을 준다.

예:
- 첫 blockquote
- 특정 섹션 제목
- 특정 표 위치
- 특정 코드블록 언어
- frontmatter의 특정 필드

---

## 14. 자동 렌더링 규칙의 큰 방향

## 14.1 순수 Markdown만으로 바로 가능한 것
아래는 추가 AI 없이 쉽게 자동 렌더링 가능하다.

1. **Heading -> TOC / 앵커 / 현재 위치 내비**
2. **Markdown Table -> 비교표 / 구조표**
3. **Blockquote -> 강조 박스 / 인용 박스**
4. **Code Fence -> 로그 패널 / 절차 패널**
5. **Horizontal Rule -> 섹션 분리선**
6. **리스트 -> 핵심 포인트 목록**
7. **이미지 -> 문서 안 미디어 블록**

## 14.2 작은 문서 규칙이 있어야 하는 것
다음은 신호가 없으면 정확한 의미 판별이 어렵다.

1. Thesis Bar
2. Question Reset Block
3. Evidence Grid
4. AI Provenance Panel
5. 다단 비교 레이아웃
6. Stage 전용 강조 블록

따라서 V1에서는 “무조건 자동 추측”이 아니라  
**문서 위치 + 섹션 제목 + frontmatter 신호** 조합으로 처리한다.

---

## 15. Heading 및 TOC 생성 규칙

## 15.1 가장 중요한 요구
문서가 `#`부터 시작하지 않아도 된다.  
예를 들어 문서가 `###`부터 시작하면, `###`를 최상위 heading으로 인식해야 한다.

## 15.2 알고리즘
1. 본문에 등장하는 모든 heading depth를 수집
2. 가장 작은 depth를 `baseDepth`로 결정
3. 이 `baseDepth`를 TOC의 시작 단계로 사용
4. `tocMaxDepth`가 `auto`면 기본적으로 `baseDepth + 1`까지만 노출
5. 더 깊은 heading은 접어서 보여주거나 숨김

## 15.3 예시
### 예시 A
```md
# 제목
## 섹션 A
### 섹션 A-1
```

- `baseDepth = 1`
- TOC 최상위 = `#`
- 기본 하위 = `##`

### 예시 B
```md
### 강의 주제
#### 관점 전환
#### 사례
##### 세부 사례
```

- `baseDepth = 3`
- TOC 최상위 = `###`
- 기본 하위 = `####`

## 15.4 추가 규칙
- `toc: none`이면 TOC 숨김
- `toc: manual`은 V2 이후 검토
- heading이 하나도 없으면 TOC 영역 자체를 숨김
- 모바일에서는 왼쪽 레일 대신 상단 드로어/버튼으로 전환
- 현재 활성 섹션은 스크롤 위치 기반으로 강조

---

## 16. 문서 블록 자동 분류 규칙

이 섹션은 Codex 구현에서 매우 중요하다.  
핵심은 **완벽한 AI 해석이 아니라, 예측 가능한 규칙**이다.

## 16.1 분류 순서
문서 블록 분류는 아래 순서로 한다.

1. Frontmatter 기반 분류
2. Section title 기반 분류
3. Block type 기반 분류
4. Block position 기반 분류
5. Fallback: 일반 Markdown 렌더링

이 우선순위를 지켜야 예외 충돌이 줄어든다.

---

## 16.2 Thesis Bar 규칙

### 목적
문서의 핵심 주장, 강의 목표, 한 줄 요약을 눈에 띄게 보여준다.

### 기본 규칙
다음 중 하나를 만족하면 `ThesisBar`로 렌더링한다.

1. H1 또는 최상위 heading 직후의 **첫 번째 blockquote**
2. frontmatter의 `summary`가 있을 경우, 문서 상단에 자동 삽입
3. `## Thesis`, `## 핵심 주장`, `## 강의 목표`, `## 요약` 같은 섹션 아래 첫 blockquote

### 예시 Markdown
```md
# AI 리터러시

> 강의 목표: 프롬프트보다 먼저, 나만의 맥락을 쌓는 지식 관리 체계가 중요하다.
```

### 기대 출력
- 왼쪽 강조선
- 본문보다 큰 글자
- 강조 색 또는 약한 배경
- Reader/Stage마다 모양 다를 수 있음

---

## 16.3 Question Reset / Reframe Block 규칙

### 목적
잘못된 질문과 다시 세운 질문을 구조적으로 대비한다.

### 기본 규칙
다음 조건을 만족하면 `QuestionResetBlock`으로 렌더링한다.

1. 섹션 제목이 아래 중 하나일 때:
   - `관점 전환`
   - `질문 재설정`
   - `Reframe`
   - `Question Reset`
   - `다시 세운 질문`
2. 해당 섹션 아래 **연속된 하위 heading 2개**가 존재
3. 각 하위 heading 아래 설명 문단이 최소 1개 이상 존재

### 예시 Markdown
```md
## 관점 전환

### 잘못된 질문
이 영화에 쓰인 프롬프트는 무엇인가?

### 다시 세운 질문
왜 어떤 사람은 같은 도구를 써도 더 밀도 높은 결과를 만드는가?
```

### 기대 출력
- 좌우 또는 상하 2칸 비교 구조
- 모바일에서는 세로로 쌓임
- 왼쪽은 기존 질문, 오른쪽은 다시 세운 질문

---

## 16.4 Evidence Grid / Evidence Panel 규칙

### 목적
현장 노트, 사례, 관찰 결과, 사례 블록을 근거 패널로 묶는다.

### 기본 규칙
다음 중 하나면 `EvidenceGrid` 또는 `EvidencePanel`로 렌더링한다.

1. 섹션 제목이 아래 중 하나:
   - `현장 노트`
   - `현장 증거`
   - `Evidence`
   - `Field Notes`
   - `사례`
2. 해당 섹션 아래에 연속된 하위 heading(`###`)들이 2개 이상 존재
3. 하위 heading 제목에 `FIELD NOTE`, `사례`, `Case`, 숫자 태그가 포함될 수 있음

### 예시 Markdown
```md
## 현장 노트

### FIELD NOTE #01
Zoubeir JLASSI 사례 ...

### FIELD NOTE #02
CMDS 구요한 대표 사례 ...
```

### 기대 출력
- 데스크톱: 2열 또는 auto-fit grid
- 모바일: 1열
- 각 블록 상단에 태그/라벨
- 하드 섀도우 가능
- 내용이 길어도 본문 흐름이 이어져야 함

---

## 16.5 Axis Compare 규칙

### 목적
비교축 기반 정리를 카드 대신 표로 보여준다.

### 기본 규칙
다음 중 하나면 `AxisTable`로 승격한다.

1. 섹션 제목이 아래 중 하나:
   - `비교`
   - `대립축`
   - `비교 축`
   - `Axis`
   - `Axis Compare`
2. 섹션 안 첫 번째 Markdown 표가 존재
3. 표의 열 개수가 3열 이상

### 기대 출력
- 좌측 첫 열은 비교축
- 오른쪽 열들은 대상 비교
- 표 전체를 가로 스크롤 가능하게 처리
- 모바일에서는 표가 깨지지 않아야 함

### 예시 Markdown
```md
## 비교

| 비교 축 | 도구 중심 접근 | 맥락 중심 접근 |
|---|---|---|
| 질문 | 어떤 툴을 썼나 | 어떤 삶과 축적이 있었나 |
| 결과 | 흉내는 가능 | 밀도는 복제 어려움 |
```

---

## 16.6 Quote / Doc Quote 규칙

### 목적
인용, 핵심 문장, 전제를 일반 본문과 분리한다.

### 기본 규칙
- 일반 blockquote는 `DocQuote`
- 단, 문서 상단 첫 blockquote는 `ThesisBar` 우선 규칙 적용
- callout 성격이 감지되면 Note/Warning 계열로 바꿀 수 있으나 V1에서는 단순화

---

## 16.7 Log / Code Panel 규칙

### 목적
명령, 절차, Markdown 예시, 시스템 흐름을 보여준다.

### 기본 규칙
- 코드블록 언어가 `log`, `bash`, `sh`, `yaml`, `json`, `md`, `markdown`일 경우 특화 스타일 적용
- `log`는 실행 기록 패널
- `markdown`은 “작성 예시” 패널
- 일반 코드블록은 기본 코드 렌더링

### 예시 Markdown
````md
```log
vault -> parse -> classify -> render -> publish
```
``````

### 기대 출력
- 모노 폰트
- 어두운 패널 허용
- 좌측 컬러 바 가능
- Stage 모드에서는 더 크게 볼 수 있음

---

## 16.8 AI Provenance Panel 규칙

### 목적
AI가 개입한 내용을 숨기지 않고, 기록과 검토 대상으로 명확히 표시한다.

### 기본 규칙
다음 중 하나면 `AIProvenancePanel` 생성

1. frontmatter에 `ai.assisted: true`
2. `## AI 기록`, `## AI Provenance`, `## AI 개입`, `## 생성 기록` 섹션 존재
3. 본문 내 특정 메타 정보 묶음이 있을 경우

### 표시 정보
- AI 사용 여부
- 모델명
- 생성/수정 시각
- 근거 파일
- 신뢰도
- 원문 복원 버튼/링크(선택)

### 기대 출력
- 파란 계열 라벨
- 기록 패널
- 본문과 분리된 메타 영역
- “검토 대상”이라는 느낌이 살아야 함

---

## 17. Plain Markdown 작성 규칙(V1 기본)

## 17.1 반드시 지원해야 할 문법
- heading
- paragraph
- list
- ordered list
- blockquote
- table
- fenced code block
- image
- horizontal rule
- emphasis / strong
- link

## 17.2 작성자에게 요구하는 최소 규칙
1. heading 구조를 가능한 명확히 쓴다
2. 표가 비교용이면 비교 섹션 안에 둔다
3. 현장 노트/사례는 한 섹션 아래 하위 heading으로 묶는다
4. 강한 한 줄 주장은 상단 blockquote 또는 summary에 둔다
5. AI 기록은 frontmatter 또는 별도 AI 섹션에 둔다

## 17.3 처음부터 강요하지 않을 것
- MDX 컴포넌트 직접 호출
- JSX
- raw HTML
- 클래스명 삽입
- 복잡한 custom syntax

---

## 18. 확장 문법 전략

## 18.1 왜 확장 문법이 필요할 수 있는가
모든 것을 순수 Markdown만으로 해결하려 하면 다음이 어려워질 수 있다.

- 아주 특수한 3열 정보 패널
- 특정 문단만 AI 생성 라벨 표시
- 복잡한 비교 박스
- 반복 가능한 커스텀 정보 박스
- 발표용 순차 공개 제어

## 18.2 V1 정책
- 기본은 plain Markdown
- 정말 필요한 경우에만 확장 문법을 도입
- 도입 우선순위:
  1. frontmatter
  2. 섹션 제목 규칙
  3. directive
  4. MDX

## 18.3 확장 문법 후보
- remark-directive 기반 커스텀 블록
- MDX 컴포넌트
- Markdoc 태그 문법

단, **V1 핵심 성공은 확장 문법 없이도 대부분이 되는 것**이다.

---

## 19. 기술 방향

## 19.1 권장 프레임워크
**Astro**

### 선택 이유
- Markdown/MDX에 강함
- 정적 페이지 생성에 적합
- 콘텐츠 중심 사이트에 잘 맞음
- 빌드 단계 처리 구조가 명확함
- 문서 작업 공간에 필요한 레이아웃 분리, content collection, 정적 라우팅에 유리함

## 19.2 핵심 기술 전략
- **정적 우선(static-first)**
- **파일 시스템 기반**
- **빌드 단계 파싱/분류**
- **클라이언트 JS 최소화**
- **상호작용은 꼭 필요한 것만**

## 19.3 초기에 하지 않을 기술
- DB
- 서버 렌더링 중심 아키텍처
- 무거운 SPA
- 복잡한 상태 관리
- 과도한 애니메이션 라이브러리

---

## 20. 추천 아키텍처

```text
source markdown (.md)
    ↓
frontmatter parse + schema validate
    ↓
markdown AST parse
    ↓
heading tree build
    ↓
semantic block classification
    ↓
normalized document model 생성
    ↓
layout variant render (Reader / Stage / Newsletter)
    ↓
static HTML output
```

## 20.1 핵심 모듈
- `parseFrontmatter`
- `collectHeadings`
- `buildSectionTree`
- `classifyBlocks`
- `normalizeDocument`
- `renderVariant`
- `generateToc`

---

## 21. 프로젝트 폴더 구조 제안

```text
project-root/
├─ src/
│  ├─ components/
│  │  ├─ shell/
│  │  │  ├─ SiteHeader.astro
│  │  │  ├─ DocRail.astro
│  │  │  ├─ MobileTocDrawer.astro
│  │  │  └─ MetadataRail.astro
│  │  ├─ blocks/
│  │  │  ├─ ThesisBlock.astro
│  │  │  ├─ QuestionResetBlock.astro
│  │  │  ├─ EvidenceGrid.astro
│  │  │  ├─ EvidencePanel.astro
│  │  │  ├─ AxisTable.astro
│  │  │  ├─ DocQuote.astro
│  │  │  ├─ LogBlock.astro
│  │  │  └─ AIProvenancePanel.astro
│  │  └─ prose/
│  │     ├─ ProseRenderer.astro
│  │     └─ MarkdownTable.astro
│  ├─ layouts/
│  │  ├─ ReaderLayout.astro
│  │  ├─ StageLayout.astro
│  │  └─ NewsletterLayout.astro
│  ├─ lib/
│  │  ├─ content/
│  │  │  ├─ schema.ts
│  │  │  ├─ headings.ts
│  │  │  ├─ classify.ts
│  │  │  ├─ normalize.ts
│  │  │  ├─ toc.ts
│  │  │  └─ slugs.ts
│  │  ├─ ui/
│  │  │  ├─ tokens.ts
│  │  │  └─ theme.ts
│  │  └─ utils/
│  │     └─ strings.ts
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ reader/
│  │  │  └─ [slug].astro
│  │  ├─ stage/
│  │  │  └─ [slug].astro
│  │  └─ newsletter/
│  │     └─ [slug].astro
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  ├─ prose.css
│  │  ├─ blocks.css
│  │  └─ stage.css
│  └─ content/
│     └─ docs/
│        ├─ prom-3-7-lecture.md
│        ├─ kakao-newsletter.md
│        └─ ...
├─ scripts/
│  └─ import-obsidian.ts
├─ tests/
│  ├─ fixtures/
│  ├─ toc.test.ts
│  ├─ classify.test.ts
│  └─ render.test.ts
├─ astro.config.mjs
├─ package.json
└─ README.md
```

---

## 22. 데이터 모델 제안

## 22.1 Frontmatter 타입
```ts
type DocFrontmatter = {
  title: string;
  slug?: string;
  docType: 'lecture' | 'newsletter' | 'note' | 'handout';
  outputs: Array<'reader' | 'stage' | 'newsletter'>;
  theme?: 'light' | 'dark' | 'auto';
  author?: string;
  date?: string;
  tags?: string[];
  summary?: string;
  heroLabel?: string;
  toc?: 'auto' | 'manual' | 'none';
  tocMaxDepth?: 'auto' | 1 | 2 | 3;
  tocTitle?: string;
  stage?: {
    enabled?: boolean;
    focusMode?: boolean;
    keyboardNav?: boolean;
    revealLists?: boolean;
  };
  ai?: {
    assisted?: boolean;
    model?: string;
    generatedAt?: string;
    sourceConfidence?: 'low' | 'medium' | 'high';
    basedOn?: string[];
  };
  rail?: {
    showMetadata?: boolean;
    showTags?: boolean;
    showToc?: boolean;
  };
};
```

## 22.2 정규화된 문서 모델
```ts
type NormalizedDoc = {
  meta: DocFrontmatter;
  headings: TocItem[];
  baseDepth: number | null;
  sections: NormalizedSection[];
};

type TocItem = {
  text: string;
  slug: string;
  depth: number;
  level: number;
  children?: TocItem[];
};

type NormalizedSection = {
  id: string;
  title: string;
  depth: number;
  blocks: NormalizedBlock[];
};

type NormalizedBlock =
  | { kind: 'thesis'; content: string }
  | { kind: 'questionReset'; items: Array<{ title: string; body: string }> }
  | { kind: 'evidenceGrid'; items: Array<{ title: string; body: string; tag?: string }> }
  | { kind: 'axisTable'; headers: string[]; rows: string[][] }
  | { kind: 'docQuote'; content: string }
  | { kind: 'log'; language?: string; code: string }
  | { kind: 'provenance'; ai: DocFrontmatter['ai'] }
  | { kind: 'prose'; html: string }
  | { kind: 'image'; src: string; alt?: string };
```

---

## 23. 기능 요구 사항

## FR-1. Markdown 소스 폴더 읽기
### 설명
시스템은 특정 폴더 또는 Obsidian vault 경로의 `.md` 파일을 읽어야 한다.

### 세부 요구
- 지정 폴더의 `.md`, `.mdx` 파일 탐색
- frontmatter 파싱
- slug 자동 생성 또는 frontmatter slug 사용
- 파일 추가/삭제/수정 시 개발 환경에서 반영

### 수용 기준
- 새 Markdown 파일을 넣으면 자동으로 페이지가 생긴다.
- slug 중복 시 경고 또는 빌드 실패

---

## FR-2. 자동 라우팅
### 설명
하나의 문서에서 여러 출력 URL을 만든다.

### 예
- `/reader/ai-literacy-prom-3-7`
- `/stage/ai-literacy-prom-3-7`
- `/newsletter/march-week-2`

### 수용 기준
- outputs에 포함된 모드만 route 생성
- outputs에 없는 모드는 생성하지 않음

---

## FR-3. 자동 TOC 생성
### 설명
본문 heading에서 TOC를 자동 생성한다.

### 세부 요구
- 최소 heading depth를 최상위로 인식
- `tocMaxDepth` 지원
- 클릭 시 해당 위치로 이동
- 현재 위치 강조
- 데스크톱: 왼쪽 레일
- 모바일: 드로어/토글

### 수용 기준
- `###`부터 시작하는 문서도 정상 TOC 생성
- heading이 없으면 TOC 숨김

---

## FR-4. 의미 블록 자동 분류
### 설명
문서 규칙에 따라 Thesis, Evidence, Compare, Provenance 같은 블록을 자동 생성한다.

### 세부 요구
- 상단 blockquote -> ThesisBar
- Reframe 섹션 -> QuestionResetBlock
- Evidence 섹션 -> EvidenceGrid
- Compare 섹션 + 표 -> AxisTable
- ai frontmatter -> ProvenancePanel
- 일반 blockquote -> DocQuote
- `log` code fence -> LogBlock

### 수용 기준
- 예시 fixture 문서가 기대한 블록으로 바뀜
- 규칙 불일치 시 일반 prose로 fallback
- 문서가 절대 깨지지 않음

---

## FR-5. Reader Layout
### 설명
일반 읽기용 문서 레이아웃 제공

### 세부 요구
- 왼쪽 rail + 오른쪽 본문
- 메타정보 표시
- 태그 표시
- 긴 문서 폭 최적화
- 표/코드/이미지 대응
- 모바일 responsive

### 수용 기준
- 360px 모바일 폭에서도 읽기 가능
- 데스크톱에서 TOC sticky 동작

---

## FR-6. Stage Layout
### 설명
발표/강의용 모드

### 세부 요구
- 더 큰 타이포
- 현재 섹션 강조
- 키보드 네비게이션
- 선택적 focus mode
- 리스트 순차 공개 옵션(후순위 가능)
- 전체 문서 스크롤 구조 유지

### 수용 기준
- 방향키 또는 J/K로 다음 섹션 이동 가능
- 현재 섹션이 시각적으로 분명함
- Reader와 같은 원본을 사용함

---

## FR-7. Newsletter Layout
### 설명
뉴스레터형 문서 모드

### 세부 요구
- 주차/날짜/카테고리 라벨
- 섹션 구분 강화
- 너무 마케팅 랜딩 같지 않게 유지
- 긴 글 기반 뉴스레터에 적합해야 함

### 수용 기준
- 주간 문서용 샘플이 별도 수작업 없이 뉴스레터 형태로 보임

---

## FR-8. 디자인 토큰 시스템
### 설명
색, 타이포, 간격, 경계, 반경을 디자인 토큰으로 관리

### 세부 요구
- 배경, 본문, 보조 텍스트, 경계, 강조색, AI 기록색 분리
- radius는 작고 단단한 방향
- typography hierarchy 고정
- prose width 고정

### 수용 기준
- 레이아웃과 블록 컴포넌트에서 하드코딩 최소화
- light/dark 전환 가능

---

## FR-9. AI Provenance 표시
### 설명
AI 개입 여부를 시각적으로 드러냄

### 세부 요구
- frontmatter `ai`가 있으면 패널 생성
- Model / Date / Confidence / Source 목록 출력
- 필요 시 원문 복원 액션을 둘 수 있도록 자리 마련

### 수용 기준
- AI metadata가 있을 때만 노출
- decorative AI UI 금지

---

## FR-10. Graceful Fallback
### 설명
문서 규칙에 맞지 않는 부분도 깨지지 않고 일반 prose로 렌더링

### 세부 요구
- 블록 분류 실패 시 prose 처리
- 오류로 전체 문서 렌더링이 중단되지 않음
- 빌드 경고는 가능하지만 결과물은 최대한 보존

### 수용 기준
- 테스트 fixture에서 일부 규칙이 빠져도 문서가 정상 표시됨

---

## FR-11. Obsidian 친화성
### 설명
사용자는 Obsidian에서 쓰는 습관을 바꾸지 않아야 한다.

### 세부 요구
- Markdown 파일 그대로 사용
- heading, table, quote, code 중심 작성 가능
- 파일명과 slug 연결
- 로컬 이미지 참조 가능
- 위키링크/옵시디언 특수 문법은 V2 후보로 열어둠

### 수용 기준
- 일반적인 Obsidian 문서가 큰 수정 없이 들어옴

---

## FR-12. 테스트 가능한 규칙 엔진
### 설명
자동 렌더링 규칙은 테스트 코드로 검증 가능해야 한다.

### 세부 요구
- heading fixtures
- section title fixtures
- evidence classification fixtures
- compare table fixtures
- fallback fixtures

### 수용 기준
- 최소 단위 테스트 제공
- TOC, classify, render 변환 핵심 경로 검증

---

## 24. 비기능 요구 사항

## NFR-1. 예측 가능성
- 같은 입력은 같은 출력이 나와야 한다.
- AI 추론에 의존하지 않는다.

## NFR-2. 유지보수성
- 디자인 토큰과 블록 컴포넌트 분리
- 레이아웃과 콘텐츠 규칙 분리
- 블록 분류 규칙은 독립 모듈화

## NFR-3. 성능
- 기본 문서 읽기는 정적 HTML 중심
- core reading에 클라이언트 JS 의존 최소화
- TOC 활성화, 드로어, Stage 내비 정도만 작은 JS 허용

## NFR-4. 반응형
- 모바일, 태블릿, 데스크톱 전부 지원
- 모바일에서 세로 스크롤 사용성이 좋아야 한다.

## NFR-5. 접근성
- heading hierarchy 유지
- 키보드 이동 가능
- 링크 focus 상태 보장
- 명도 대비 확보

## NFR-6. 문서 안정성
- 규칙 미충족 시 fallback
- 빌드 실패 기준을 너무 공격적으로 잡지 않음
- 다만 필수 frontmatter 누락 등은 경고 또는 실패 처리 가능

---

## 25. UI 및 컴포넌트 상세 요구

## 25.1 Shell 컴포넌트
### SiteHeader
- 상단 고정 헤더
- 문서 집합 이름, 모드, 빠른 이동, theme toggle(선택)
- Stage에서는 더 단순하게 가능

### DocRail
- 데스크톱 왼쪽 레일
- TOC + 메타정보 + 태그
- sticky
- 현재 섹션 active 상태

### MobileTocDrawer
- 모바일용 TOC
- 버튼 누르면 열림
- 섹션 이동 후 자동 닫힘

---

## 25.2 Block 컴포넌트
### ThesisBlock
- 핵심 주장 또는 강의 목표
- 큰 글자, 왼쪽 컬러 바, 가벼운 배경 가능

### QuestionResetBlock
- 2개 하위 항목을 비교
- 데스크톱 2열, 모바일 1열

### EvidenceGrid / EvidencePanel
- 연속 사례를 패널 묶음으로 표시
- 패널 상단 라벨 허용
- 정보 단위가 분명해야 함

### AxisTable
- 비교축 표
- 첫 열 강조
- 표 헤더 스타일 분명히
- 모바일 가로 스크롤 허용

### DocQuote
- 일반 본문과 구분된 인용/핵심 문장 박스

### LogBlock
- 명령형, 절차형, 코드 예시 패널
- 모노 폰트
- 시각적으로 안정적

### AIProvenancePanel
- AI 생성/요약/개입 기록 패널
- 모델, 날짜, 근거, 신뢰도 노출
- 과장된 장식 금지

---

## 26. 디자인 시스템 방향

## 26.1 색
- 기본 배경: 밝은 캔버스
- 본문 표면: 흰색 또는 아주 옅은 회색
- 주요 텍스트: 거의 검정
- 보조 텍스트: 회색
- 강조색: 차가운 파란색 계열
- AI 기록색: 파란 계열 분리
- Stage 모드: 검정/짙은 남색 계열 허용

## 26.2 타이포
- 제목 위계가 분명해야 함
- 본문 폭은 긴 글 가독성을 해치지 않는 정도로 제한
- 모노 폰트는 라벨/로그/메타 영역에 사용
- 과한 폰트 실험 금지

## 26.3 경계와 그림자
- 흐린 장식 그림자보다 경계선 우선
- 하드 섀도우는 Evidence 같은 구조 강조에 한정
- radius는 낮게 유지

## 26.4 레이아웃
- 왼쪽 레일 + 오른쪽 본문 기본
- 모바일에서는 레일을 접음
- 지나친 카드 갤러리 구조 지양
- 스크롤 흐름을 끊지 않음

---

## 27. 문서 유형별 기본 동작

## 27.1 lecture
- Reader + Stage 기본
- Thesis, Reframe, Evidence, Compare, Conclusion 흐름에 강함

## 27.2 newsletter
- Reader + Newsletter 기본
- 날짜/주차 라벨, 섹션 구분 강함
- 주간 이슈 정리에 적합

## 27.3 note
- Reader 기본
- 분류 규칙이 적게 적용되어도 됨
- prose fallback 비중 높음

## 27.4 handout
- Reader + Print 후보
- 프린트/PDF 친화 레이아웃은 V2 이후 검토

---

## 28. 샘플 문서 규칙 예시

````markdown
---
title: "AI 리터러시"
docType: "lecture"
outputs: ["reader", "stage"]
author: "안창현"
date: "2026-03-07"
summary: "프롬프트보다 먼저, 나만의 맥락을 쌓는 지식 관리 체계가 중요하다."
toc: "auto"
ai:
  assisted: true
  model: "gemini-3.1-pro"
  generatedAt: "2026-03-07T14:22:00+09:00"
  sourceConfidence: "high"
---

# AI 리터러시: 콘텐츠에 최적화된 시청자의 몰입을 만드는 법

> 강의 목표: 프롬프트 기술보다 먼저, 나만의 삶과 맥락을 쌓는 지식 관리 체계가 중요하다.

## 관점 전환

### 잘못된 질문
이 영화에 쓰인 이미지 프롬프트는 무엇인가?

### 다시 세운 질문
왜 어떤 사람은 같은 도구를 써도 더 밀도 높은 결과를 만드는가?

## 현장 노트

### FIELD NOTE #01
Zoubeir JLASSI 사례 ...

### FIELD NOTE #02
7,000개의 마크다운 노트를 쌓은 사례 ...

## 비교

| 비교 축 | 도구 중심 접근 | 맥락 중심 접근 |
|---|---|---|
| 질문 | 어떤 툴을 썼나 | 어떤 삶과 축적이 있었나 |
| 결과 | 흉내는 가능 | 밀도는 복제 어려움 |

## 실행 로그

```log
vault -> parse -> classify -> render -> publish
```
````

### 기대 출력
- 상단 summary 또는 첫 blockquote -> ThesisBlock
- 관점 전환 -> QuestionResetBlock
- 현장 노트 -> EvidenceGrid
- 비교 표 -> AxisTable
- 실행 로그 -> LogBlock
- ai metadata -> AIProvenancePanel
- heading -> DocRail TOC

---

## 29. 예외 처리 규칙

## 29.1 heading이 없는 문서
- TOC 숨김
- 본문만 렌더링

## 29.2 표가 너무 넓은 문서
- 테이블 컨테이너에 가로 스크롤
- 모바일 레이아웃 깨짐 금지

## 29.3 Evidence 섹션인데 하위 heading이 1개뿐인 경우
- grid 대신 single EvidencePanel

## 29.4 Reframe 섹션인데 하위 heading이 3개 이상인 경우
- 기본 prose 섹션으로 두거나, 옵션으로 2개까지만 QuestionResetBlock 처리
- V1에서는 예외를 단순하게 처리

## 29.5 ai metadata가 비어 있는 경우
- provenance 패널 숨김

## 29.6 문서가 `###`부터 시작하는 경우
- `###`를 최상위 heading으로 인식
- TOC level 1은 `###`

## 29.7 규칙 제목이 여러 언어로 쓰이는 경우
- 한국어/영어 동의어 사전 지원
- 예: `비교`, `Axis`, `Compare`, `대립축`

---

## 30. 상태와 상호작용

## 30.1 Reader
- active section highlight
- smooth scroll optional
- metadata rail sticky
- mobile TOC drawer

## 30.2 Stage
- keyboard section jump
- focus current section
- optional “dim other sections”
- optional list reveal
- fullscreen 친화

## 30.3 공통
- heading anchor copy
- theme switch(optional)
- collapse metadata(optional)

---

## 31. 검색, 태그, 역링크에 대한 입장

이 기능들은 유용하지만 V1 핵심은 아니다.

### V1
- 태그 표시만
- 태그 페이지는 없어도 됨

### V2 후보
- 전체 검색
- 태그별 문서 모음
- 관련 문서
- 역링크
- vault graph 비슷한 탐색

이유:  
처음 성공 기준은 **글쓰기 원본 -> 자동 출력**이다.  
탐색 기능은 그 다음이다.

---

## 32. 개발 우선순위

## Phase 0 — 시스템 골격 추출
목표: 기존 HTML 프로토타입에서 토큰과 블록 패턴을 추출

### 산출물
- tokens.css
- ThesisBlock
- QuestionResetBlock
- EvidencePanel
- AxisTable
- AIProvenancePanel
- ReaderLayout 초안

## Phase 1 — Reader MVP
목표: Markdown 한 파일을 Reader 화면으로 안정적으로 자동 렌더링

### 필수 범위
- Markdown ingestion
- frontmatter schema
- TOC 자동 생성
- baseDepth 감지
- Thesis / Evidence / Compare / Quote / Log / Provenance 처리
- responsive layout
- fallback 안정화

## Phase 2 — Stage Mode
목표: 같은 원본으로 발표 화면 제공

### 필수 범위
- StageLayout
- 키보드 내비
- active section focus
- theme/tone 차별화
- optional fullscreen

## Phase 3 — Newsletter Mode
목표: 주간 문서용 변형 레이아웃

### 필수 범위
- newsletter route
- section label style
- weekly metadata style
- 문서형 뉴스레터 화면

## Phase 4 — 확장 기능
- directive/MDX escape hatch
- search/tag pages
- print mode
- Obsidian wiki-link 처리
- 이미지 캡션 강화

---

## 33. 위험 요소와 대응

## 33.1 위험: 자동 의미 판별이 과해질 수 있음
### 설명
규칙이 공격적이면 사용자가 예측하기 어렵다.

### 대응
- 규칙은 적고 명확하게
- 섹션 제목 기반 분류부터 시작
- 실패하면 prose fallback

## 33.2 위험: Reader와 Stage가 너무 달라질 수 있음
### 설명
같은 원본인데 결과가 너무 달라지면 유지보수가 어렵다.

### 대응
- 구조는 공유
- 표현만 다르게
- block data model은 공통 유지

## 33.3 위험: Markdown으로 모든 것을 해결하려는 과한 욕심
### 설명
복잡한 블록이 늘어나면 무리하게 순수 Markdown에 우겨 넣을 수 있다.

### 대응
- V1은 plain Markdown 우선
- V2부터 directive/MDX 허용
- 복잡한 5~10%에만 escape hatch 사용

## 33.4 위험: 수작업 TOC나 수작업 섹션 정보가 다시 들어올 수 있음
### 대응
- heading -> TOC 자동화를 강제
- 중복 작성 금지

## 33.5 위험: 일반 블로그처럼 흘러갈 수 있음
### 대응
- thesis-first
- evidence-forward
- compare-table 우선
- provenance 노출
- left rail 구조 고정

---

## 34. 테스트 전략

## 34.1 단위 테스트
- heading baseDepth 계산
- toc tree 생성
- section title alias 매칭
- evidence classification
- compare table classification
- fallback behavior

## 34.2 fixture 테스트
아래 샘플 Markdown 파일로 자동 렌더링 결과 확인
- lecture-basic.md
- lecture-starts-at-h3.md
- newsletter-basic.md
- evidence-single.md
- no-headings.md
- ai-provenance.md

## 34.3 시각 회귀 테스트(선택)
- Reader screenshot
- Stage screenshot
- mobile screenshot

## 34.4 수용 테스트
- 사용자가 수작업 HTML 없이 문서를 넣었을 때 원하는 구조가 자동으로 나오는지 확인

---

## 35. 성공 지표

정량 지표와 정성 지표를 함께 본다.

## 35.1 정성 지표
- 사용자가 HTML/PPT 변환 프롬프트를 덜 쓰게 되는가
- “글만 쓰면 된다”는 체감이 생기는가
- 발표와 배포가 한 원본으로 충분하다고 느끼는가
- 모바일에서 자료 읽기가 편해졌는가

## 35.2 정량 지표(내부 기준)
- 신규 문서 추가 시 수작업 파일 수 감소
- 하나의 문서 수정 시 수정해야 하는 출력물 수 감소
- HTML 수작업 빈도 감소
- AI 변환 요청 횟수 감소

---

## 36. MVP 수용 기준(Definition of Done)

다음이 되면 V1 MVP 완료로 본다.

1. `.md` 파일을 콘텐츠 폴더에 넣으면 자동 route가 생긴다.
2. 같은 파일에서 `/reader/[slug]`와 `/stage/[slug]` 두 화면이 생성된다.
3. heading 시작 depth가 `#`가 아니어도 TOC가 정상 생성된다.
4. 상단 blockquote는 ThesisBlock으로 보인다.
5. `관점 전환` 섹션의 두 하위 heading은 QuestionResetBlock으로 보인다.
6. `현장 노트` 섹션의 연속 하위 heading은 EvidenceGrid 또는 EvidencePanel로 보인다.
7. `비교` 섹션의 표는 AxisTable로 보인다.
8. `log` 코드블록은 LogBlock으로 보인다.
9. `ai` frontmatter가 있으면 AIProvenancePanel이 보인다.
10. 규칙에 맞지 않는 문서는 일반 prose로 안전하게 렌더링된다.
11. 데스크톱은 왼쪽 sticky TOC, 모바일은 접히는 TOC가 동작한다.
12. 사용자는 콘텐츠 파일 안에 raw HTML을 쓰지 않아도 된다.

---

## 37. 구현 금지 사항

Codex는 아래 방향을 피해야 한다.

1. 콘텐츠 파일 안에 HTML을 강제하지 말 것
2. TOC를 본문과 따로 수작업 작성하게 만들지 말 것
3. 블록 의미 판별에 LLM 호출을 넣지 말 것
4. 초기부터 DB/CMS/인증을 붙이지 말 것
5. 카드형 랜딩 페이지 스타일로 흐르지 말 것
6. 디자인 토큰 없이 클래스 하드코딩만 늘리지 말 것
7. 문서 구조가 규칙에서 벗어났다고 전체 렌더링을 깨뜨리지 말 것
8. Reader와 Stage를 완전히 별개 앱처럼 만들지 말 것

---

## 38. Codex 구현 지시문(짧은 버전)

아래 문단은 Codex 시작 프롬프트로 바로 붙여도 된다.

> Build an Astro-based static-first document workspace that takes Markdown files as the single source of truth and renders them into Reader, Stage, and Newsletter views without manual HTML authoring. The system must auto-generate a left TOC rail from headings, detect the minimum heading depth as the top TOC level, and classify common Markdown structures into semantic UI blocks using deterministic rules: top blockquote -> ThesisBlock, “관점 전환/Reframe” section with two child headings -> QuestionResetBlock, “현장 노트/Evidence” section with repeated child headings -> EvidenceGrid, “비교/Axis” section with a table -> AxisTable, `log` code fences -> LogBlock, and frontmatter `ai` metadata -> AIProvenancePanel. Use build-time parsing and graceful fallback to standard prose when rules do not match. Avoid databases, CMS, heavy client JS, or AI inference in rendering. Optimize for scroll-first lecture documents and mobile readability. Reader and Stage must share the same content source but use different layouts.

---

## 39. Codex 구현 지시문(긴 버전)

### 목표
Markdown 작성만으로 강의/발표/뉴스레터 화면을 자동 생성하는 문서 엔진을 만든다.

### 필수 원칙
- Markdown is source of truth
- static-first
- deterministic rendering
- plain Markdown first
- structure over decoration
- scroll-first layout
- reader/stage separation
- provenance visible

### 꼭 구현해야 할 것
- content ingestion
- frontmatter validation
- auto routing
- TOC generation with min heading depth
- semantic block classification
- reader layout
- stage layout
- provenance panel
- fallback safety
- responsive design

### 꼭 지켜야 할 UX
- left rail on desktop
- mobile drawer on small screens
- no manual TOC duplication
- no raw HTML required in content
- long-form readability
- mobile-friendly vertical scroll
- lecture-friendly stage mode

### 설계 톤
- brutal structure
- thesis-first
- evidence-forward
- line, table, rail over ornamental cards
- AI shown as record, not magic

---

## 40. 앞으로 열어둘 확장 방향

1. Obsidian wiki-link 처리
2. graph/backlink view
3. full-text search
4. directive/MDX custom blocks
5. print/PDF mode
6. handout-optimized layout
7. annotation/comment layer
8. private/public publishing split

---

## 41. 최종 정리

이 제품은 단순한 Markdown 뷰어가 아니다.  
또 단순한 Astro 블로그도 아니다.  
그리고 PPT 대체물 하나를 만드는 일도 아니다.

이 제품은 다음을 목표로 한다.

- **글쓰기 원본을 Markdown 하나로 통일**
- **그 원본에서 발표/읽기/배포 화면을 자동 출력**
- **사용자의 논증 방식과 강의 방식 자체를 UI 규칙으로 고정**
- **AI 후처리 의존 없이, 규칙 기반으로 안정적으로 렌더링**
- **모바일 세로 스크롤 시대에 맞는 문서형 발표 체계 확립**

즉, 이것은 “Markdown으로 웹페이지를 만든다”가 아니라,

> **Markdown으로 사고하고,  
> 그 사고 구조를 문서 엔진이 여러 화면으로 번역하게 만드는 시스템**이다.
