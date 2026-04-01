# Release Notes

## v2.0.0

이번 릴리스는 기존 viewer를 단순 유지보수 버전이 아니라, 구조적으로 분리된 V2 배포본으로 올리기 위한 첫 기준점입니다.

### Added

- Pretext 기반 제목 균형, thesis/quote 보정, evidence/stage heuristic
- 홈 `Workspace Documents` Omnisearch
- `#tag`, `AND`, `OR`를 지원하는 검색식 기반 필터
- YouTube URL image-style markdown 자동 임베드 처리
- Obsidian callout / custom callout 분류 보정
- overflow 방지용 이미지/코드/콜아웃 레이아웃 보강
- GitHub V2 배포용 `package:v2` 패키징 스크립트

### Improved

- `launch-viewer.cmd` / `launch-viewer.ps1` 첫 실행 UX
- Node.js LTS만 있으면 의존성 자동 설치 후 실행되는 배포 흐름
- Windows 경로/인코딩 환경에서의 실행 안정성
- 홈 검색 UX와 검색 결과 상태 표시

### Packaging

- 기존 GitHub 저장소를 백업 후 같은 저장소에 V2 기준으로 갱신
- GitHub Release용 runtime ZIP 동시 제공

### Notes

- 이번 릴리스는 `pretext-main` 폴더를 앱 의존성으로 직접 포함하지 않습니다.
- `public/_doc-assets`는 현재 vault를 기준으로 재생성되는 로컬 런타임 자산이므로 배포본에 포함하지 않습니다.
