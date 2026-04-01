# Publish To GitHub

## 1. 사전 준비

- Node.js LTS 설치
- Git 설치
- 기존 `laguna821/achmage-markdown-renderer` 저장소 내용 백업 완료

## 2. 배포 산출물 만들기

프로젝트 루트에서 아래를 실행합니다.

```powershell
npm test
npm run check
npm run build
npm run test:e2e
npm run package:v2
```

산출물은 상위 폴더의 `release-builds` 아래 생성됩니다.

- `..\release-builds\achmage-markdown-renderer`
- `..\release-builds\achmage-markdown-renderer-runtime`
- `..\release-builds\achmage-markdown-renderer-runtime-2.0.0.zip`

## 3. 첫 Git 커밋 준비

`package:v2`는 소스 폴더 안에서 `git init`과 `git add .`까지 시도합니다.

만약 첫 커밋이 자동으로 생기지 않았다면, 보통 Git 사용자 정보가 없는 상태입니다. 아래를 한 번만 설정하면 됩니다.

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

그 뒤 소스 패키지 폴더에서 아래를 실행합니다.

```powershell
cd ..\release-builds\achmage-markdown-renderer
git status
git commit -m "chore: prepare v2.0.0"
```

## 4. 기존 GitHub 저장소에 연결

```powershell
cd ..\release-builds\achmage-markdown-renderer
git remote add origin https://github.com/laguna821/achmage-markdown-renderer.git
git branch -M main
git push -u origin main
```

## 5. 릴리스 태그 생성

```powershell
git tag v2.0.0
git push origin v2.0.0
```

## 6. GitHub Release 업로드

GitHub 웹에서 `v2.0.0` 릴리스를 만든 뒤 아래 ZIP을 업로드합니다.

- `..\release-builds\achmage-markdown-renderer-runtime-2.0.0.zip`

릴리스 설명에는 최소한 아래를 적는 것을 권장합니다.

- Pretext 통합
- Omnisearch 추가
- launcher 개선
- 기존 저장소 백업 후 V2 기준으로 갱신

## 7. 새 PC 사용자 안내 문구

README 또는 Release 본문에는 아래 조건을 분명히 적습니다.

- Node.js LTS 필요
- Git은 선택 사항
- ZIP 다운로드 후 `launch-viewer.cmd` 실행
- 첫 실행 시 `npm install` 자동 수행
- vault 경로 입력 후 브라우저 자동 오픈
