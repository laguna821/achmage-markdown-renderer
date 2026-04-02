# Achmage Markdown Renderer V4

> No more HTML/PPT vibe coding. Markdown writing to frontend rendering. Focus on writing.

Achmage Markdown Renderer는 Obsidian에 써둔 Markdown 문서를 로컬에서 바로 프론트엔드 화면으로 보여주는 뷰어입니다.

핵심은 단순합니다.

- 글은 Obsidian에서 씁니다.
- 별도의 HTML을 다시 만들지 않습니다.
- 별도의 PPT를 다시 만들지 않습니다.
- 노트를 다른 도구로 또 옮겨 적지 않습니다.
- vault 경로만 열면, 이미 써둔 Markdown이 바로 보기 좋은 화면으로 렌더링됩니다.

즉, 이 프로젝트는 "글은 쓰는데, 보여주려고 또 다른 제작 작업을 반복하는 시간"을 없애기 위해 만들었습니다.

## 이게 왜 필요한가요?

많은 사람이 아직도 이런 흐름으로 작업합니다.

1. Obsidian이나 메모앱에서 글을 씁니다.
2. 발표나 공유를 위해 다시 HTML을 만듭니다.
3. 또는 다시 PPT를 만듭니다.
4. 또는 NotebookLM, 슬라이드 툴, 디자인 툴로 또 옮깁니다.

이 과정은 결과물은 좋아 보여도, 결국 시간과 집중력과 비용이 듭니다.

Achmage Markdown Renderer는 여기서 질문을 바꿉니다.

"이미 Markdown으로 잘 정리해둔 글이 있는데, 왜 또 다시 만들어야 하지?"

이 앱은 그 질문에서 출발합니다.

## 누구를 위한 앱인가요?

이 앱은 특히 아래 사용자에게 맞습니다.

- Obsidian에 글을 많이 쌓아둔 사람
- PPT나 HTML을 직접 만드는 것이 귀찮은 사람
- 개발자가 아니지만 노트는 잘 쓰는 사람
- 강의안, 리서치 노트, 문서, 에세이, 자료집을 자주 보여줘야 하는 사람
- "글만 잘 쓰면 나머지는 자동으로 보기 좋게 나오면 좋겠다"는 사람

쉽게 말해, "글쓸 줄은 아는데 프론트엔드는 모르겠다"는 사람을 위한 도구입니다.

## 이 앱으로 할 수 있는 일

- Obsidian vault 전체를 로컬에서 바로 읽어옵니다.
- Markdown 문서를 reader 화면으로 예쁘게 보여줍니다.
- 문서가 lecture 타입이면 stage 화면도 같이 뽑아줍니다.
- newsletter 타입이면 newsletter 화면도 같이 뽑아줍니다.
- 홈 화면에서 문서 전체를 Omnisearch로 검색할 수 있습니다.
- 긴 문서도 TOC가 자동 생성되고 현재 읽는 위치를 따라갑니다.
- 테마를 바꿔가며 같은 문서를 다른 분위기로 볼 수 있습니다.

## 가장 중요한 특징

### 1. Markdown이 원본입니다

이 앱의 가장 큰 장점은 Markdown이 "진짜 원본"이라는 점입니다.

다른 결과물을 만들기 위해 내용을 다시 옮기지 않습니다.
글을 고치고 싶으면 Obsidian에서 Markdown만 수정하면 됩니다.

### 2. HTML/PPT를 따로 다시 만들 필요가 없습니다

보통은 "작성"과 "보여주기"가 분리되어 있습니다.
이 앱은 그 둘을 최대한 붙입니다.

즉:

- 작성은 Obsidian
- 렌더링은 Achmage Markdown Renderer

로 끝납니다.

### 3. 로컬 기반이라 빠르고 부담이 적습니다

문서는 내 컴퓨터에서 바로 읽고 렌더링합니다.
클라우드에 올려서 기다리는 방식이 아닙니다.

장점은 명확합니다.

- 반응이 빠릅니다.
- 개인 노트를 외부 서비스에 매번 업로드하지 않아도 됩니다.
- 인터넷이 끊겨도 한 번 설치된 뒤에는 로컬 실행이 가능합니다.

주의:
처음 실행할 때 의존성 설치를 위해 인터넷이 한 번 필요할 수 있습니다.

### 4. Omnisearch가 들어 있습니다

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

### 5. 테마가 4개입니다

현재 지원 테마는 아래 4가지입니다.

- Light
- Dark
- Aurora
- Cyber Sanctuary

같은 문서라도 목적에 따라 다르게 볼 수 있습니다.

- 차분하게 읽고 싶으면 Light
- 집중해서 오래 보고 싶으면 Dark
- 부드럽고 인상적인 느낌이면 Aurora
- 존재감 있고 강한 화면이면 Cyber Sanctuary

### 6. TOC가 자동 생성됩니다

문서의 heading 구조를 읽어서 TOC를 자동으로 만듭니다.

또한 이번 버전에서는 TOC 동작도 더 자연스럽게 정리했습니다.

- 긴 섹션에서도 active highlight가 중간에 꺼지지 않습니다.
- 다음 heading이 나오기 전까지 현재 섹션 표시가 유지됩니다.
- 문서 하단처럼 더 이상 스크롤이 안 되는 구간도 자연스럽게 active가 바뀝니다.
- TOC가 너무 길면 TOC 패널도 내부 스크롤로 따라옵니다.

### 7. Markdown와 Obsidian 문법을 폭넓게 처리합니다

실제로 잘 보이도록 챙긴 항목은 아래와 같습니다.

- 제목, 문단, 리스트, 인용문
- 표
- 코드 블록
- 이미지
- 자동 TOC
- Obsidian wiki link
- Obsidian callout
- YouTube 링크의 임베드 처리
- 긴 콘텐츠의 overflow 방지

즉, "그냥 글만 쓰면 어느 정도 알아서 보기 좋은 화면이 된다"에 초점을 맞췄습니다.

## ZIP으로 가장 쉽게 실행하는 방법

이 방식이 가장 쉽습니다. Git을 몰라도 됩니다.

### 준비물

- Windows
- Node.js LTS

Git은 몰라도 되고, 없어도 됩니다.

### 실행 순서

1. GitHub에서 이 저장소를 ZIP으로 다운로드합니다.
2. 압축을 풉니다.
3. 폴더 안에서 `launch-viewer.cmd`를 더블클릭합니다.
4. 첫 실행이면 필요한 패키지를 자동으로 설치합니다.
5. Obsidian vault 경로를 입력합니다.
6. 브라우저가 자동으로 열립니다.

정말로 중요한 건 여기까지입니다.

이 프로젝트는 "ZIP으로 받아서 실행해도 바로 돌아가게" 만드는 것을 기준으로 정리되어 있습니다.

## vault 경로는 무엇을 넣으면 되나요?

보통은 내 Obsidian 노트가 들어 있는 폴더 경로를 넣으면 됩니다.

예시:

```text
C:\Users\YourName\Documents\MyVault
```

앱은 그 폴더 안의 Markdown 문서를 읽어와서 홈 화면과 reader/stage/newsletter 화면에 반영합니다.

한 번 입력한 경로는 다음 실행 때 다시 불러오므로, 매번 다시 입력할 필요가 줄어듭니다.

## 실행 후에는 어떻게 쓰나요?

일상적인 사용 흐름은 아래와 같습니다.

1. Obsidian에서 글을 씁니다.
2. `launch-viewer.cmd`를 실행합니다.
3. 홈 화면에서 문서를 찾습니다.
4. reader, stage, newsletter 중 필요한 출력으로 엽니다.
5. 테마를 바꿔가며 읽거나 보여줍니다.

핵심은 "작업 중심이 항상 Markdown"이라는 점입니다.

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

### Newsletter

newsletter 타입 문서를 더 에디토리얼하게 보여주기 위한 화면입니다.

- 레터형 문서
- 요약과 커버 중심 문서

## 이 앱이 특히 잘 맞는 사용 예시

- 강의 특강 자료를 Obsidian에서 쓰고 바로 보여주고 싶은 경우
- 연구 메모나 리서치 노트를 읽기 좋은 화면으로 바로 열고 싶은 경우
- 에세이, 사유 노트, 글감 정리 문서를 발표 화면처럼 보여주고 싶은 경우
- 팀원이나 지인에게 "내 노트 구조"를 바로 보여주고 싶은 경우
- PPT를 다시 만드는 작업이 너무 아까운 경우

## 개발자나 고급 사용자용 명령

평소에는 `launch-viewer.cmd`만 써도 됩니다.
아래는 고급 사용자용입니다.

```powershell
npm install
npm run dev
npm run check
npm test
npm run test:e2e
npm run build
```

## GitHub 배포용 패키지 만들기

저장소 업로드용 소스 패키지와 런타임 ZIP이 필요하면 아래 명령을 사용합니다.

```powershell
npm run package:v4
```

생성 위치:

- `..\release-builds\achmage-markdown-renderer`
- `..\release-builds\achmage-markdown-renderer-runtime`
- `..\release-builds\achmage-markdown-renderer-runtime-4.0.0.zip`

## 이 저장소에서 바로 중요한 파일

- `launch-viewer.cmd`
  가장 쉬운 실행 진입점
- `launch-viewer.ps1`
  실제 실행 로직
- `src/`
  앱 소스
- `tests/`
  테스트
- `PUBLISH_TO_GITHUB.md`
  GitHub 업로드 메모
- `RELEASE_NOTES.md`
  릴리스 요약

## 자주 묻는 질문

### Q. Git을 몰라도 되나요?

네. 그냥 ZIP으로 받아서 압축을 푼 뒤 `launch-viewer.cmd`를 실행하면 됩니다.

### Q. HTML을 따로 만들어야 하나요?

아니요. 그게 이 프로젝트의 핵심입니다. Markdown이 원본이고, 이 앱이 그 Markdown을 프론트엔드로 렌더링합니다.

### Q. PPT를 따로 만들어야 하나요?

꼭 그럴 필요가 없습니다. 보여주기용으로 다시 만드는 시간을 줄이기 위해 이 앱을 만들었습니다.

### Q. 내 노트가 외부 서버로 올라가나요?

기본 사용 흐름은 로컬 실행입니다. 내 컴퓨터에서 vault를 읽어와 로컬로 렌더링합니다.

### Q. 처음 실행이 느릴 수 있나요?

네. 첫 실행은 필요한 패키지를 설치하므로 조금 걸릴 수 있습니다. 그 다음부터는 훨씬 빠릅니다.

## 한 줄 요약

Obsidian에 글만 쓰세요.

Achmage Markdown Renderer가 그 Markdown을 바로 보여주는 화면으로 바꿉니다.

HTML도, PPT도, 다시 만드는 추가 노동도 줄이기 위해 만든 프로젝트입니다.
