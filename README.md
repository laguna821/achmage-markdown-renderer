# Achmage Markdown Renderer

Astro 기반 정적 문서 워크스페이스입니다. Markdown를 단일 원본으로 읽어 `Reader`, `Stage`, `Newsletter` 출력으로 컴파일합니다.

## 새 컴퓨터에서 바로 쓰는 법

별도 `Astro` 전역 설치는 필요 없습니다.

새 컴퓨터에 필요한 것은 이것뿐입니다.

- `Git`
- `Node.js LTS`
- 인터넷 연결

`Astro`와 나머지 패키지는 프로젝트 안에서 `npm install`로 자동 설치됩니다.  
즉, 다른 컴퓨터에서는 이 저장소만 내려받고 처음 한 번만 의존성을 설치하면 됩니다.

## Windows 완전 초보용 설치 가이드

아래 순서대로 그대로 하면 됩니다.

### 1. Git 설치

- [Git for Windows](https://git-scm.com/download/win) 설치
- 설치 중 옵션은 기본값 그대로 진행해도 됩니다

### 2. Node.js 설치

- [Node.js LTS](https://nodejs.org/) 설치
- 설치 중 옵션은 기본값 그대로 진행해도 됩니다

### 3. 이 프로젝트 내려받기

PowerShell 또는 명령 프롬프트를 열고 아래를 입력합니다.

```powershell
git clone <여기에-깃허브-주소>
cd Markdown_Ach
```

### 4. 실행

가장 쉬운 방법은 프로젝트 폴더에서 아래 둘 중 하나를 쓰는 겁니다.

방법 A:

```powershell
.\launch-viewer.cmd
```

방법 B:

```powershell
powershell -ExecutionPolicy Bypass -File .\launch-viewer.ps1
```

### 5. 처음 실행할 때 일어나는 일

처음 실행이면 런처가 자동으로 `npm install`을 돌립니다.  
이때는 몇 분 걸릴 수 있습니다. 끝나면 브라우저가 자동으로 열립니다.

### 6. vault 경로 입력

런처가 `Master vault path`를 물어보면, 보고 싶은 Obsidian 폴더 경로를 붙여 넣으면 됩니다.

예시:

```text
C:\Users\사용자이름\Documents\MyObsidianVault
```

### 7. 다음번 실행

다음부터는 마지막으로 쓴 vault 경로를 기본값으로 기억합니다.  
그냥 `Enter`만 쳐도 같은 vault가 다시 열립니다.

### 8. 종료

viewer 전용으로 뜬 PowerShell 창을 닫으면 서버도 같이 종료됩니다.

## 아주 짧은 답

- 새 컴퓨터에서도 쓸 수 있습니다
- `Astro`를 따로 설치할 필요는 없습니다
- 대신 `Node.js`는 설치해야 합니다
- 첫 실행 때 `npm install`은 한 번 필요합니다
- 지금은 그 설치를 런처가 자동으로 처리합니다

## 핵심 규칙

- 콘텐츠 기본 위치는 `src/content/docs`
- 환경변수 `DOC_WORKSPACE_CONTENT_DIR`를 주면 외부 Obsidian vault를 대신 읽음
- 필수 frontmatter는 `title`, `docType`, `outputs`
- `outputs`가 라우트를 결정하고 `stage.*`는 Stage 화면 동작만 제어
- `toc: manual`은 V1에서 지원하지 않고 `auto`로 경고 후 fallback

## 주요 명령

```bash
npm install
npm run test
npm run build
npm run dev
```

## Windows Launcher

Windows에서는 루트의 [launch-viewer.cmd](C:\Users\82109\Desktop\Markdown_Ach\launch-viewer.cmd) 또는 [launch-viewer.ps1](C:\Users\82109\Desktop\Markdown_Ach\launch-viewer.ps1)로 실제 vault를 바로 띄울 수 있습니다.

```powershell
.\launch-viewer.cmd
```

동작 순서:

- 마지막으로 사용한 vault 경로 또는 `.doc-workspace-content-dir`를 기본값으로 제안
- `node_modules`가 없으면 자동으로 `npm install` 실행
- 필요하면 새 vault 경로를 입력
- 이전 viewer 세션이 살아 있으면 종료
- 빈 로컬 포트를 찾아 새 PowerShell 창에서 `npm run dev` 실행
- 브라우저를 자동으로 열고, viewer 전용 PowerShell 창을 닫으면 서버도 종료

옵션:

```powershell
.\launch-viewer.cmd -VaultPath "D:\MasterVault"
.\launch-viewer.cmd -VaultPath "D:\MasterVault" -Port 4330
.\launch-viewer.cmd -DryRun
```

## 구조

- `src/lib/content`: source parsing, schema validation, slugging, TOC, classification, normalization
- `src/components`: shell, semantic blocks, prose renderer
- `src/layouts`: Reader / Stage / Newsletter layouts
- `tests`: unit tests and Playwright smoke coverage

## Authoring Contract

```yaml
---
title: "AI 리터러시"
docType: "lecture"
outputs: ["reader", "stage"]
summary: "프롬프트보다 먼저, 나만의 맥락을 쌓는 지식 관리 체계가 중요하다."
toc: "auto"
ai:
  assisted: true
  model: "gemini-3.1-pro"
---
```

### V1 자동 승격 규칙

- 상단 `summary` 또는 첫 유효 blockquote -> `ThesisBlock`
- `관점 전환` 계열 섹션 + 하위 heading 2개 -> `QuestionResetBlock`
- `현장 노트` 계열 섹션 + 하위 heading 2개 이상 -> `EvidenceGrid`
- `현장 노트` 계열 섹션 + 하위 heading 1개 -> `EvidencePanel`
- `비교` 계열 섹션의 첫 표 -> `AxisTable`
- `log` fenced code -> `LogBlock`
- `ai` frontmatter -> `AIProvenancePanel`
- 규칙 불일치 -> prose fallback
