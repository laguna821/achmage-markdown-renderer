# Release Notes

## v6.0.0-beta.4

This release restores ultra-v3 navigation parity in the shipped desktop stage mode so logical slide movement and vertical continuation movement no longer feel inverted.

### Changed

- Remapped desktop stage keyboard controls to ultra-v3 semantics: left and right now move between logical groups, while up and down move within continued frames before crossing group boundaries
- Reassigned the stage HUD so the right-side vertical rail is frame-only and the bottom control bar is logical-group-only
- Removed the bottom horizontal frame-dot strip and clarified the counter display so multi-frame groups show `group-frame` as secondary status
- Bumped the renderer, desktop app, and Tauri packaging metadata to `6.0.0-beta.4`

## v6.0.0-beta.3

This release corrects the shipping desktop app so V6 stage mode now lands in the packaged installer instead of only in the Astro renderer shell.

### Added

- Desktop-native universal `stage` mode in `achmage-reader-universal-v5`
- New stage deck modules under `src/stage/*` for horizontal grouping, vertical continuation frames, and Pretext-backed block measurement
- Dedicated desktop `StageDocumentView` with left/right group navigation, up/down frame navigation, `Space`, `Home`, `End`, click zones, counters, and frame dots
- Desktop unit and jsdom coverage for universal stage links, stage pagination, and stage view navigation

### Changed

- `?view=stage&doc=<slug>` now works for every desktop document, including reader-only notes
- Home cards and the top header now always expose `Stage`, while `Reader` and `Newsletter` remain conditional
- Removed the old scroll-highlight desktop stage behavior with rail / TOC / mobile drawer from the shipped stage mode
- Bumped the renderer, desktop app, and Tauri packaging metadata to `6.0.0-beta.3`

## v6.0.0-beta.2

This release keeps the V6 universal stage rollout intact and adds GitHub Actions desktop packaging for the beta line.

### Added

- Automatic GitHub Actions release builds for `v6.*` tags
- Manual workflow dispatch support for rebuilding release assets against an existing V6 tag
- Windows installer, Windows portable zip, macOS DMG, and macOS app zip publishing on the V6 release line

### Changed

- Bumped the renderer and desktop packaging metadata to `6.0.0-beta.2`
- Kept the V6 universal stage renderer changes from `v6.0.0-beta.1` as the feature baseline

## v6.0.0-beta.1

This release introduces the renderer-native V6 stage overhaul.

### Added

- Universal `stage` routes for every document, including reader-only notes
- Full-bleed presentation stage below the existing top bar
- Renderer-native horizontal/vertical slide grouping and continuation pagination
- Stage mode switcher links in the top header and home cards
- Stage-specific unit and end-to-end coverage for navigation and universal route generation

### Changed

- Replaced the old scroll-highlight stage mode with a real presentation shell
- Removed stage rail / TOC / mobile drawer behavior from stage pages
- Kept reader and newsletter rendering behavior intact while preserving the existing theme system

## v4.0.0

이번 버전은 "Markdown을 다시 만들지 말고 그대로 보여주자"는 방향을 더 분명하게 다듬은 릴리스입니다.

### Added

- 4번째 테마 `Cyber Sanctuary`
- 긴 문서용 TOC active 유지 로직
- 문서 하단 구간까지 자연스럽게 이어지는 TOC active 판정
- 긴 TOC에서 현재 active 항목을 따라오는 rail auto-scroll
- v4 기준 배포 패키징 흐름

### Improved

- 4개 테마 순환 UX 정리
- 데스크톱과 모바일 TOC 동작 일관성 개선
- 긴 섹션과 짧은 하단 섹션에서의 읽기 흐름 개선
- ZIP 다운로드 후 실행하는 사용자 기준 문서 전면 개편

### Existing Core Features

- Obsidian/Markdown vault 로컬 렌더링
- Omnisearch
- 자동 TOC
- Reader / Stage / Newsletter 출력
- 표, 코드 블록, 이미지, Obsidian callout, wiki link, YouTube embed 처리

### Packaging

- `npm run package:v4`로 GitHub 업로드용 소스 패키지와 런타임 ZIP 생성
- 런타임 ZIP 이름은 `package.json` 버전을 기준으로 자동 생성
