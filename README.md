# Achmage Markdown Renderer V2

Achmage Markdown Renderer V2는 Obsidian/Markdown 문서를 정적 뷰어로 읽기 좋게 렌더링하는 Astro 기반 문서 엔진입니다.

이번 V2는 기존 `laguna821/achmage-markdown-renderer` 저장소를 백업 후 갱신해서 올리는 업그레이드 배포본입니다. 핵심 변화는 아래와 같습니다.

- Pretext 기반 줄 배치 보정
- 홈 `Workspace Documents` Omnisearch
- `launch-viewer.cmd` 기준 첫 실행 자동 설치
- Windows 새 PC 기준 배포 흐름 정리

## 실행 조건

- Node.js LTS 설치 필요
- Git은 선택 사항
- `node_modules`는 저장소에 포함하지 않음

## 가장 쉬운 실행 방법

1. 이 저장소를 ZIP으로 내려받거나 Git으로 받습니다.
2. 압축을 풀고 프로젝트 폴더를 엽니다.
3. `launch-viewer.cmd`를 실행합니다.
4. 처음 실행이면 `npm install`이 자동으로 한 번 수행됩니다.
5. 마스터 vault 경로를 입력하면 브라우저가 자동으로 열립니다.

## 수동 실행

```powershell
npm install
npm run dev
```

기본 런처는 아래 파일입니다.

- `launch-viewer.cmd`
- `launch-viewer.ps1`

## 주요 개발 명령

```powershell
npm test
npm run check
npm run build
npm run test:e2e
```

## GitHub V2 패키지 만들기

이 프로젝트는 GitHub 업로드용 산출물을 자동으로 만들 수 있습니다.

```powershell
npm run package:v2
```

명령이 끝나면 현재 프로젝트의 상위 폴더 아래 `release-builds`에 아래 산출물이 생성됩니다.

- `achmage-markdown-renderer`
  GitHub 업로드용 소스 저장소 작업 폴더
- `achmage-markdown-renderer-runtime`
  일반 사용자용 런타임 폴더
- `achmage-markdown-renderer-runtime-2.0.0.zip`
  GitHub Release 업로드용 ZIP

## 배포 원칙

- 기존 `laguna821/achmage-markdown-renderer` 저장소 내용은 이미 백업해둔 상태를 전제로, 같은 저장소의 새 버전으로 갱신합니다.
- `@chenglou/pretext`는 로컬 폴더 동봉이 아니라 npm dependency로 유지합니다.
- 새 PC에서의 "바로 실행"은 `Node.js LTS만 미리 설치`된 상태를 의미합니다.

## GitHub 업로드 가이드

상세 업로드 순서는 아래 문서를 보면 됩니다.

- `PUBLISH_TO_GITHUB.md`
- `RELEASE_NOTES.md`
