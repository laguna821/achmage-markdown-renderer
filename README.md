# Achmage Markdown Renderer

> No more HTML/PPT vibe coding. Markdown writing to frontend rendering. Focus on writing.

## 최신버전 링크 목록 (윈도우 설치파일 바로가기)
https://github.com/laguna821/achmage-markdown-renderer/tags

> [!IMPORTANT]
> Achmage Markdown Renderer는 "이미 Obsidian에 써둔 Markdown을 다시 HTML이나 PPT로 옮겨 적지 않고", 바로 읽고 보여주는 화면으로 렌더링하는 프로젝트입니다.
>
> v4는 ZIP 실행 중심의 로컬 런처였고, v5는 Windows와 macOS에서 설치형 앱으로 배포되는 독립 실행 데스크톱 앱 라인입니다.

> [!NOTE]
> 이 README는 GitHub에서 읽어도 이해되도록 쓰였지만, 동시에 Achmage Markdown Renderer로 열었을 때도 가독성이 좋도록 `H2`, `H3`, 요약 박스, 코드 블록, 강한 문단 리듬을 기준으로 다시 정리한 문서입니다.

## 3줄 요약

- 글은 Obsidian에서 쓰고, 렌더링은 Achmage Markdown Renderer가 맡습니다.
- v5부터는 Windows `.exe` / `.zip`, macOS `.dmg` / `.app.zip` 형태의 설치형 배포를 기준으로 갑니다.
- README 마지막 절반에는 "Achmage Markdown Renderer 기준으로 잘 읽히는 Markdown을 어떻게 써야 하는가"까지 문서 작성 가이드로 붙였습니다.

## 이 프로젝트는 정확히 무엇인가

Achmage Markdown Renderer는 Obsidian에 써둔 Markdown 문서를 로컬에서 바로 프론트엔드 화면으로 보여주는 뷰어입니다.

핵심은 단순합니다.

- 글은 Obsidian에서 씁니다.
- 별도의 HTML을 다시 만들지 않습니다.
- 별도의 PPT를 다시 만들지 않습니다.
- 노트를 다른 도구로 또 옮겨 적지 않습니다.
- vault 경로만 열면, 이미 써둔 Markdown이 바로 보기 좋은 화면으로 렌더링됩니다.

즉, 이 프로젝트는 "글은 쓰는데, 보여주려고 또 다른 제작 작업을 반복하는 시간"을 없애기 위해 만들었습니다.

## 왜 이게 필요한가

많은 사람이 아직도 이런 흐름으로 작업합니다.

1. Obsidian이나 메모앱에서 글을 씁니다.
2. 발표나 공유를 위해 다시 HTML을 만듭니다.
3. 또는 다시 PPT를 만듭니다.
4. 또는 NotebookLM, 슬라이드 툴, 디자인 툴로 또 옮깁니다.

이 과정은 결과물은 좋아 보여도, 결국 시간과 집중력과 비용이 듭니다.

Achmage Markdown Renderer는 여기서 질문을 바꿉니다.

"이미 Markdown으로 잘 정리해둔 글이 있는데, 왜 또 다시 만들어야 하지?"

이 앱은 그 질문에서 출발합니다.

## 누구를 위한 앱인가

이 앱은 특히 아래 사용자에게 맞습니다.

- Obsidian에 글을 많이 쌓아둔 사람
- PPT나 HTML을 직접 만드는 것이 귀찮은 사람
- 개발자가 아니지만 노트는 잘 쓰는 사람
- 강의안, 리서치 노트, 문서, 에세이, 자료집을 자주 보여줘야 하는 사람
- "글만 잘 쓰면 나머지는 자동으로 보기 좋게 나오면 좋겠다"는 사람

쉽게 말해, "글쓸 줄은 아는데 프론트엔드는 모르겠다"는 사람을 위한 도구입니다.

## v4와 v5는 무엇이 다른가

### v4

기존 v4는 Windows에서 ZIP을 받아 `launch-viewer.cmd`를 실행하는 흐름에 최적화되어 있었습니다.

- Node.js가 필요했습니다.
- 첫 실행 시 의존성 설치가 있었습니다.
- 로컬 개발용 구조가 그대로 런타임에 따라 들어갔습니다.
- ZIP을 풀면 파일 수가 많아졌고, macOS 실행은 사실상 배포 단위로 준비되어 있지 않았습니다.

### v5

v5는 같은 철학을 유지하되, 배포 단위를 완전히 바꿉니다.

- Windows installer `.exe`
- Windows portable `.zip`
- macOS installer `.dmg`
- macOS portable `.app.zip`

즉, v5의 목표는 "Node/npm/PowerShell을 설치하고 실행하는 툴"이 아니라 "Markdown Renderer를 바로 실행하는 앱"입니다.

> [!TIP]
> v4가 "잘 쓰는 사람이 직접 실행하는 툴"에 가까웠다면, v5는 "배포 가능한 독립 실행 앱"에 가깝습니다.

## 지금 무엇을 받을 수 있나

v5 기준 공식 산출물은 아래 4가지입니다.

- Windows installer `.exe`
- Windows portable `.zip`
- macOS installer `.dmg`
- macOS portable `.app.zip`

릴리스는 GitHub Releases 기준으로 공개 prerelease 형태로 배포합니다.

### 설치형을 쓸 사람

아래 경우에는 설치형이 맞습니다.

- 일반 사용자에게 배포할 때
- 학교 컴퓨터나 개인 컴퓨터에 "앱처럼" 넣고 쓸 때
- 바탕화면 바로가기, 설치 흐름, 제거 흐름까지 자연스럽게 가져가고 싶을 때

### 포터블을 쓸 사람

아래 경우에는 포터블이 맞습니다.

- 관리자 권한 없는 환경에서 테스트할 때
- USB나 클라우드 폴더로 옮겨 다니며 실행할 때
- 설치 흔적을 최소화하고 싶을 때

## v5 빠른 시작

### Windows

1. GitHub Releases에서 installer `.exe` 또는 portable `.zip`을 받습니다.
2. 설치형이면 설치 후 실행합니다.
3. 포터블이면 압축을 푼 뒤 실행 파일을 엽니다.
4. 첫 실행에서 vault 경로를 지정합니다.
5. 홈 화면에서 문서를 찾고 `reader`, `stage`, `newsletter`로 엽니다.

### macOS

1. GitHub Releases에서 `.dmg` 또는 `.app.zip`을 받습니다.
2. `.dmg`는 마운트 후 앱을 Applications로 복사합니다.
3. `.app.zip`은 압축 해제 후 앱을 원하는 위치에 둡니다.
4. 첫 실행에서 보안 경고가 나면 macOS의 일반적인 앱 허용 절차를 따릅니다.
5. vault 경로를 지정한 뒤 같은 방식으로 문서를 엽니다.

> [!WARNING]
> v5 beta는 현재 unsigned prerelease를 기준으로 배포됩니다. 따라서 Windows SmartScreen이나 macOS Gatekeeper 경고가 나올 수 있습니다.

## 첫 실행에서 무엇을 하게 되나

앱을 처음 열면 가장 중요한 입력은 하나입니다.

- 내 Obsidian vault 경로

예시:

```text
C:\Users\YourName\Documents\MyVault
```

또는 macOS 예시:

```text
/Users/yourname/Documents/MyVault
```

앱은 그 폴더 안의 Markdown 문서를 읽어와 홈 화면과 `reader / stage / newsletter` 화면에 반영합니다.

한 번 입력한 경로는 다음 실행 때 다시 불러오므로, 매번 다시 입력할 필요가 줄어듭니다.

## 이 앱으로 할 수 있는 일

- Obsidian vault 전체를 로컬에서 바로 읽어옵니다.
- Markdown 문서를 `reader` 화면으로 보기 좋게 보여줍니다.
- 문서가 lecture 타입이면 `stage` 화면도 같이 뽑아줍니다.
- newsletter 타입이면 `newsletter` 화면도 같이 뽑아줍니다.
- 홈 화면에서 문서 전체를 Omnisearch로 검색할 수 있습니다.
- 긴 문서도 TOC가 자동 생성되고 현재 읽는 위치를 따라갑니다.
- 테마를 바꿔가며 같은 문서를 다른 분위기로 볼 수 있습니다.

## 출력 모드

### Reader

가장 기본적인 읽기 화면입니다.

- 긴 글 읽기
- 노트 탐색
- TOC 기반 이동
- 테마 바꿔가며 보기

### Stage

강의안이나 발표용 문서를 더 집중해서 보여주기 위한 화면입니다.

- lecture 문서에 적합
- 발표 흐름에 맞는 시각적 집중도
- "강의/특강/발표"처럼 한 번에 메시지를 전달해야 하는 문서에 적합

### Newsletter

newsletter 타입 문서를 더 에디토리얼하게 보여주기 위한 화면입니다.

- 레터형 문서
- 요약과 커버 중심 문서
- 장문의 공유 글, 브리프, 에세이형 정리문에 적합

## 가장 중요한 특징

### 1. Markdown이 원본이다

이 앱의 가장 큰 장점은 Markdown이 "진짜 원본"이라는 점입니다.

다른 결과물을 만들기 위해 내용을 다시 옮기지 않습니다. 글을 고치고 싶으면 Obsidian에서 Markdown만 수정하면 됩니다.

### 2. HTML/PPT를 따로 다시 만들 필요가 없다

보통은 "작성"과 "보여주기"가 분리되어 있습니다. 이 앱은 그 둘을 최대한 붙입니다.

즉:

- 작성은 Obsidian
- 렌더링은 Achmage Markdown Renderer

로 끝납니다.

### 3. 로컬 기반이라 빠르고 부담이 적다

문서는 내 컴퓨터에서 바로 읽고 렌더링합니다. 클라우드에 올려서 기다리는 방식이 아닙니다.

장점은 명확합니다.

- 반응이 빠릅니다.
- 개인 노트를 외부 서비스에 매번 업로드하지 않아도 됩니다.
- 네트워크 상태와 무관하게 로컬 작업 흐름을 유지할 수 있습니다.

### 4. Omnisearch가 들어 있다

홈 화면에서 제목만 찾는 것이 아니라 문서 전반을 검색할 수 있습니다.

지원 예시:

- 제목 검색
- 본문 검색
- YAML 메타데이터 검색
- `#태그` 검색
- `AND`, `OR` 조합 검색

예시:

```text
AI 리터러시 AND #메타인지
```

### 5. 테마를 바꿔가며 같은 문서를 다르게 볼 수 있다

현재 프로젝트의 대표 테마는 아래 흐름으로 이해하면 쉽습니다.

- `Light`: 차분하고 기본적인 읽기
- `Dark`: 오래 읽기 좋은 집중형
- `Aurora`: 부드럽고 인상적인 톤
- `Cyber Sanctuary`: 존재감 있고 강한 무드

같은 문서라도 목적에 따라 다르게 볼 수 있습니다.

### 6. TOC가 자동 생성되고 읽기 흐름을 따라간다

문서의 heading 구조를 읽어서 TOC를 자동으로 만듭니다.

또한 최근 버전에서는 TOC 동작도 더 자연스럽게 정리했습니다.

- 긴 섹션에서도 active highlight가 중간에 꺼지지 않습니다.
- 다음 heading이 나오기 전까지 현재 섹션 표시가 유지됩니다.
- 문서 하단처럼 더 이상 스크롤이 안 되는 구간도 자연스럽게 active가 바뀝니다.
- TOC가 너무 길면 TOC 패널도 내부 스크롤로 따라옵니다.

### 7. Markdown와 Obsidian 문법을 폭넓게 처리한다

실제로 잘 보이도록 챙긴 항목은 아래와 같습니다.

- 제목, 문단, 리스트, 인용문
- 표
- 코드 블록
- 이미지
- 자동 TOC
- Obsidian wiki link
- Obsidian callout
- YouTube 링크 임베드
- 긴 콘텐츠의 overflow 방지

즉, "그냥 글만 쓰면 어느 정도 알아서 보기 좋은 화면이 된다"에 초점을 맞췄습니다.

## 이 앱이 특히 잘 맞는 사용 예시

- 강의 특강 자료를 Obsidian에서 쓰고 바로 보여주고 싶은 경우
- 연구 메모나 리서치 노트를 읽기 좋은 화면으로 바로 열고 싶은 경우
- 에세이, 사유 노트, 글감 정리 문서를 발표 화면처럼 보여주고 싶은 경우
- 팀원이나 지인에게 "내 노트 구조"를 바로 보여주고 싶은 경우
- PPT를 다시 만드는 작업이 너무 아까운 경우

## v4를 계속 써야 하는 경우

v4 방식이 완전히 필요 없어지는 것은 아닙니다.

아래 상황이면 v4 실행 흐름이 여전히 유효할 수 있습니다.

- Windows에서 `launch-viewer.cmd` 기반 로컬 런처가 더 익숙한 경우
- 기존 Node.js 기반 개발 환경 위에서 바로 수정/실행하고 싶은 경우
- 데스크톱 앱보다 기존 Astro 구조를 직접 만지며 실험하는 경우

즉, v4는 "개발 친화적 런처형", v5는 "배포 친화적 앱형"이라고 보면 됩니다.

## 개발자와 저장소 관점에서 중요한 파일

### v4 루트 기준

- `launch-viewer.cmd`
  가장 쉬운 실행 진입점
- `launch-viewer.ps1`
  실제 실행 로직
- `src/`
  v4 앱 소스
- `tests/`
  테스트
- `PUBLISH_TO_GITHUB.md`
  GitHub 업로드 메모
- `RELEASE_NOTES.md`
  릴리스 요약

### v5 앱 기준

- `achmage-reader-universal-v5/`
  v5 독립 실행 앱 프로젝트 루트
- `achmage-reader-universal-v5/src/`
  React 기반 데스크톱 프런트엔드
- `achmage-reader-universal-v5/src-tauri/`
  Tauri 2 / Rust 기반 데스크톱 런타임
- `achmage-reader-universal-v5/scripts/`
  릴리스 아티팩트 스테이징, 검증, 체크섬 생성
- `.github/workflows/release-achmage-reader-v5-beta.yml`
  Windows/macOS 빌드와 공개 prerelease 발행 워크플로우

## 개발자용 명령

### v4

```powershell
npm install
npm run dev
npm run check
npm test
npm run test:e2e
npm run build
```

### v4 GitHub 배포용 패키지

```powershell
npm run package:v4
```

생성 위치:

- `..\release-builds\achmage-markdown-renderer`
- `..\release-builds\achmage-markdown-renderer-runtime`
- `..\release-builds\achmage-markdown-renderer-runtime-4.0.0.zip`

### v5

```powershell
cd achmage-reader-universal-v5
npm install
npm run dev
npm run test
npm run build
```

### v5 로컬 패키징

Windows:

```powershell
cd achmage-reader-universal-v5
npm run package:windows
npm run stage:release-assets -- --platform windows
npm run verify:release-assets -- --platform windows
npm run package:release-manifest
```

macOS:

```powershell
cd achmage-reader-universal-v5
npm run package:macos
npm run stage:release-assets -- --platform macos
npm run verify:release-assets -- --platform macos
npm run package:release-manifest
```

## Achmage Markdown Renderer 기준으로 Markdown를 잘 쓰는 법

여기서부터는 단순한 설치 문서가 아니라, "Achmage Markdown Renderer로 열었을 때 실제로 가독성이 좋은 Markdown은 어떻게 쓰는가"에 대한 작성 가이드입니다.

이 내용은 별도 가이드북의 핵심을 README용으로 재정리한 것입니다.

### 왜 이 렌더러에서는 잘 읽히는 글이 다르게 보이나

Achmage Markdown Renderer는 "줄줄 읽는 문서"보다 "구조가 먼저 보이고, 필요한 곳에서 시선이 멈추는 문서"에 더 강합니다.

읽는 사람은 보통 본문 첫 줄부터 차분히 읽지 않습니다. 먼저 아래 순서대로 시선이 꽂히는 경우가 많습니다.

1. `## Heading 2`
2. `### Heading 3`
3. 콜아웃 박스 텍스트
4. 스크린샷 / 이미지
5. 코드 블록
6. 볼드 텍스트
7. 일반 문단

> [!IMPORTANT]
> Achmage Renderer에서 잘 읽히는 문서는 "문장이 많은 문서"가 아니라, **위계가 먼저 보이는 문서**입니다.

즉, 문서를 쓸 때는 "무슨 말을 할까?"만이 아니라 "독자의 시선이 어디에서 멈출까?"를 같이 설계해야 합니다.

## 가장 먼저 지켜야 할 문서 구조

### 1. 문서의 큰 구획은 `##`로 나눈다

Achmage Renderer에서 `H2`는 그냥 제목이 아니라 화면 전환 장치에 가깝습니다.

- TOC에서 구조가 가장 잘 보이는 단위
- 스크롤 중 현재 위치를 가장 안정적으로 알려주는 단위
- 긴 글을 "읽을 수 있는 덩어리"로 만드는 단위

그래서 문서가 길어질수록 `##`는 아껴야 하는 것이 아니라, 오히려 더 명확하게 써야 합니다.

### 2. `###`는 긴 `##` 안에서만 쓴다

`H3`는 선택형 보조 구조입니다.

- `##` 하나가 너무 길어질 때
- 같은 주제 안에서 2~3개의 하위 흐름이 있을 때
- 예시/반례/비교/실전 포인트를 나눌 때

반대로 모든 소제목을 `###`로 잘게 쪼개면 문서가 "정리된 것처럼 보이지만 실제로는 힘이 약한 글"이 됩니다.

### 3. `####` 이하는 기본적으로 쓰지 않는다

깊은 heading 계층은 문서가 정교해 보이는 대신 읽기 흐름은 약해집니다.

Achmage Renderer 기준으로는 보통 아래 정도면 충분합니다.

- `##`: 화면 단위 전환
- `###`: 긴 섹션 내부 보조 구조

## frontmatter는 어떻게 쓰는가

### 최소 템플릿

아주 최소한으로 시작하려면 아래만 있어도 됩니다.

```yaml
---
title: 문서 제목
docType: note
outputs:
  - reader
---
```

### 추천 템플릿

가급적이면 아래처럼 명시적으로 적는 편이 좋습니다.

```yaml
---
title: 문서 제목
docType: note
outputs:
  - reader
author: 작성자 이름
date: 2026-04-04
tags:
  - achmage
  - markdown
  - obsidian
summary: |
  - 이 문서가 말하는 핵심 1
  - 이 문서가 말하는 핵심 2
heroLabel: guide
toc: auto
---
```

### 왜 이렇게 쓰는가

이렇게 써두면 다음이 좋아집니다.

- `METADATA` rail이 깔끔하게 채워집니다.
- `TAGS`가 문서 탐색용 구조가 됩니다.
- `summary`가 있으면 문서 첫인상과 핵심 요약이 빨라집니다.
- `outputs`가 문서의 렌더링 맥락을 분명하게 해줍니다.

> [!TIP]
> frontmatter는 장식이 아니라 문서의 분류, 탐색, 출력 맥락을 설명하는 구조 정보입니다.

## 본문을 쓸 때의 실제 규칙

### 문단은 "한 문단 한 메시지"로 쓴다

문단이 길다고 무조건 나쁜 것은 아닙니다. 하지만 하나의 문단 안에 배경, 주장, 예시, 반론, 결론을 다 밀어 넣으면 읽는 사람이 길을 잃습니다.

좋은 문단은 보통 아래와 같습니다.

- 한 문단에 한 메시지
- 보통 2문장~4문장
- 문단 사이에 화면 리듬이 느껴짐
- 다음 문단으로 넘어갈 이유가 분명함

### 볼드는 문단 전체가 아니라 결론에만 쓴다

볼드는 강력하지만 남용하면 힘이 사라집니다.

권장:

- 핵심 결론
- 정의 문장
- 문단 마지막 한 줄 요약

비권장:

- 한 문단 전체를 볼드
- 거의 모든 문단마다 2~3개 이상 볼드
- heading이 약한데 볼드로만 위계를 대신하는 경우

### 리스트는 정말 리스트일 때만 쓴다

리스트는 아래 경우에 특히 좋습니다.

- 순서
- 체크리스트
- 분류
- 비교 기준
- 핵심 포인트 요약

그 외에는 리스트보다 짧은 문단이 더 읽기 좋습니다.

## 블록별 작성법

### 콜아웃 박스

콜아웃은 "예뻐 보이는 박스"가 아니라 시선을 강제로 멈추게 하는 장치입니다.

잘 쓰는 경우:

- 지금 섹션의 핵심을 압축 요약할 때
- 독자에게 반드시 기억시켜야 할 한 문장을 강조할 때
- 다음 문단을 읽기 전에 관점을 꺾어야 할 때

예시:

```md
> [!IMPORTANT]
> 이 섹션의 핵심은 "툴보다 질문 구조가 먼저"라는 점이다.
```

### 이미지와 스크린샷

이미지는 아무 데나 넣는 것이 아니라 아래 위치에서 특히 잘 작동합니다.

- 주제 전환 직후
- 복잡한 설명 직후
- UI나 문서 결과를 보여줘야 할 때

즉, 이미지는 설명을 시작하는 장치이거나, 설명을 닫는 증거여야 합니다.

### 코드 블록

코드 블록은 개발 문서에서만 필요한 것이 아닙니다.

Achmage Renderer에서는 아래 역할을 합니다.

- 설명을 구체화하는 예시
- 긴 문단 중간의 휴지부
- 복붙 가능한 실전 포인트

예시:

```md
## 빠른 시작

이 섹션에서는 최소 frontmatter를 먼저 보여준다.

```yaml
---
title: 문서 제목
docType: note
outputs:
  - reader
---
```
```

### 링크, 위키 링크, 태그

- 일반 링크는 외부 자료 연결용으로 쓴다.
- `[[위키 링크]]`는 vault 내부 문맥 연결에 좋다.
- `#태그`는 본문보다 frontmatter `tags`에 두는 편이 관리가 쉽다.
- `inline code`는 파일명, 명령어, 필드명에만 쓴다.

## Achmage Renderer 특화 규칙

### `reader`, `stage`, `newsletter`를 먼저 상상하고 쓴다

문서를 쓰기 전에 먼저 생각할 질문은 이겁니다.

"이 글은 어디에서 읽힐 글인가?"

- `reader`: 긴 글, 노트, 에세이, 연구 메모
- `stage`: 강의안, 발표안, 특강 원고
- `newsletter`: 에디토리얼한 공유 글, 요약 문서

같은 Markdown이라도 목적이 다르면 문서 리듬이 달라집니다.

### TOC, METADATA, TAGS를 함께 설계한다

좋은 문서는 본문만 좋아서는 안 됩니다. 좌측 rail에서 봐도 구조가 보여야 합니다.

체크 포인트:

- TOC에서 `H2`만 읽어도 문서 흐름이 보이는가
- `METADATA`에서 문서 성격이 바로 드러나는가
- `TAGS`가 검색과 분류에 실제로 도움이 되는가

## 안 좋은 예 / 좋은 예

### 안 좋은 예

```md
이 문서는 Achmage Renderer에서 잘 읽히는 글을 쓰는 방법을 설명한다. 그런데 모든 내용을 계속 평문으로만 이어 쓰고, 문단이 길고, 소제목이 거의 없고, 중요한 문장은 거의 전부 볼드로 처리한다. 중간중간 이미지를 넣고 싶다는 말도 하지만 실제로는 어디에 넣는지가 설명되지 않는다.
```

왜 안 좋은가:

- 구조가 먼저 안 보입니다.
- TOC가 비어 있거나 너무 약해집니다.
- 볼드가 heading 역할을 대신하려다 힘이 빠집니다.

### 좋은 예

```md
## 왜 구조가 먼저인가

문서는 문장보다 구조가 먼저 읽힌다.

> [!IMPORTANT]
> Achmage Renderer에서 잘 읽히는 글은 "위계가 먼저 보이는 글"이다.

## 어떻게 쓰는가

H2는 화면 전환마다 쓰고, H3는 긴 섹션에서만 보조적으로 쓴다.
```

왜 좋은가:

- H2만 읽어도 흐름이 보입니다.
- 콜아웃이 정확히 한 번 멈춰야 할 지점을 만들어 줍니다.
- 본문이 짧지만 목적이 분명합니다.

## 완성형 템플릿 1: 강의형 문서

```md
---
title: 생성형 AI 시대의 질문 설계
docType: lecture
outputs:
  - reader
  - stage
author: 홍길동
date: 2026-04-04
tags:
  - lecture
  - ai
  - literacy
summary: |
  - 이 강의의 핵심은 "툴보다 질문 구조가 먼저"라는 점이다.
  - 학생은 프롬프트보다 맥락 설계를 먼저 배워야 한다.
heroLabel: lecture
toc: auto
---

## 왜 질문 설계가 먼저인가

강의의 첫 메시지를 분명히 제시한다.

> [!IMPORTANT]
> 생성형 AI에서 결과의 질은 도구보다 질문 구조의 질에 더 크게 좌우된다.

## 1. 질문은 결과의 방향을 정한다

설명을 먼저 짧게 적는다.

### 흔한 오해

- 프롬프트만 길면 된다
- 도구만 잘 쓰면 된다
- 예시만 많이 보면 된다

### 다시 읽는 질문

학생이 먼저 물어야 할 것은 "무슨 프롬프트를 쓸까?"가 아니라 "무엇을 분명하게 정의할까?"다.

## 2. 실전에서 바로 쓰는 구조

```text
역할
목표
제약 조건
출력 형식
좋은 예 / 나쁜 예
```

## 마무리

오늘 배운 내용을 3줄로 정리한다.
```

이 템플릿이 좋은 이유:

- `stage`에 적합한 큰 전환이 `H2`로 분명합니다.
- `H3`는 길어진 `H2` 안에서만 씁니다.
- 콜아웃과 코드 블록이 각각 강조와 실전 예시 역할을 나눠 가집니다.

## 완성형 템플릿 2: 에세이형 문서

```md
---
title: 왜 좋은 문서는 결국 구조에서 힘이 나는가
docType: note
outputs:
  - reader
author: 홍길동
date: 2026-04-04
tags:
  - writing
  - structure
  - obsidian
summary: |
  - 좋은 문서는 표현보다 구조가 먼저 보이기 때문에 오래 읽힌다.
  - 독자는 문장을 순서대로 읽기 전에 먼저 위계를 읽는다.
heroLabel: essay
toc: auto
---

## 좋은 문서는 문장보다 구조에서 시작된다

많은 사람은 글을 잘 쓴다는 말을 문장을 예쁘게 쓰는 능력으로 이해한다. 하지만 실제로는 그렇지 않다. 긴 글에서 독자가 먼저 읽는 것은 문장보다 구조다.

> [!IMPORTANT]
> 글이 길어질수록 문장력보다 구조력이 먼저 드러난다.

## 구조가 살아 있으면 독자는 길을 잃지 않는다

독자는 보통 H2를 먼저 읽고, 그다음 중간 제목과 강조 요소를 읽는다. 그래서 구조가 분명하면 긴 글도 따라가기 쉽다.

## 볼드는 결론을 위해 아껴야 한다

모든 문장을 중요하게 만들면 결국 아무 문장도 중요해 보이지 않는다. **볼드는 결론 문장과 정의 문장에만 써야 실제로 힘이 산다.**

## 마무리

좋은 문서는 화려한 문장이 아니라, 읽는 사람이 길을 잃지 않게 만드는 문서다.
```

이 템플릿이 좋은 이유:

- H2만 읽어도 에세이의 논리 흐름이 보입니다.
- H3 없이도 구조가 무너지지 않습니다.
- 제한된 콜아웃과 제한된 볼드만으로 밀도를 높입니다.

## 복붙 체크리스트

- [ ] `title`, `docType`, `outputs`를 적었는가
- [ ] 가능하면 `author`, `date`, `tags`, `summary`, `heroLabel`, `toc`도 적었는가
- [ ] 문서의 큰 전환마다 `##`가 있는가
- [ ] `###`는 정말 긴 섹션에서만 썼는가
- [ ] 콜아웃은 "여기서 독자의 시선이 멈춰야 한다"는 곳에만 넣었는가
- [ ] 이미지나 스크린샷은 설명 직후나 전환 직후에 두었는가
- [ ] 코드 블록은 복붙 가능한 예시 역할을 하는가
- [ ] 볼드가 너무 많지 않은가
- [ ] TOC에서 `H2`만 읽어도 문서 흐름이 보이는가
- [ ] `METADATA`와 `TAGS`를 봤을 때 문서의 정체성이 분명한가

## 자주 묻는 질문

### Q. Git을 몰라도 사용할 수 있나

네. v5는 원칙적으로 Git을 몰라도 설치 파일만 받으면 실행할 수 있게 만드는 것이 목표입니다.

### Q. HTML을 따로 만들어야 하나

아니요. 그게 이 프로젝트의 핵심입니다. Markdown이 원본이고, 이 앱이 그 Markdown을 프론트엔드로 렌더링합니다.

### Q. PPT를 따로 만들어야 하나

꼭 그럴 필요가 없습니다. 보여주기용으로 다시 만드는 시간을 줄이기 위해 이 프로젝트를 만들었습니다.

### Q. 내 노트가 외부 서버로 올라가나

기본 사용 흐름은 로컬 실행입니다. 내 컴퓨터에서 vault를 읽어와 로컬로 렌더링합니다.

### Q. 처음 실행이 느릴 수 있나

v4는 첫 실행에 의존성 설치가 있어 느릴 수 있었고, v5는 그 부분을 없애는 방향으로 배포 단위를 바꿨습니다.

### Q. 어떤 README를 기준으로 보면 되나

이 README는 v5 기준 총정리입니다. 다만 저장소 루트에는 여전히 v4 문맥의 파일과 스크립트가 남아 있을 수 있으므로, "배포와 사용 흐름"은 v5 기준으로, "기존 런처와 소스 구조 이해"는 v4 기준으로 같이 보면 됩니다.

## 마지막 요약

Obsidian에 글만 쓰세요.

Achmage Markdown Renderer는 그 Markdown을 바로 보여주는 화면으로 바꾸는 프로젝트입니다.

v4는 ZIP 실행 중심 도구였고, v5는 Windows와 macOS에서 설치 파일로 배포되는 독립 실행 앱입니다.

그리고 이 프로젝트의 진짜 힘은 "Markdown을 렌더링한다"는 사실만이 아니라, **처음부터 렌더러 기준으로 잘 읽히는 문서를 쓰게 만든다**는 데 있습니다.
