# Publish To GitHub

이 문서는 v4 기준 배포 메모입니다.

## 1. 먼저 검증

```powershell
npm test
npm run check
npm run build
$env:CI='1'; $env:PLAYWRIGHT_TEST_PORT='4322'; npm run test:e2e
```

## 2. GitHub 업로드용 패키지 만들기

```powershell
npm run package:v4
```

생성 위치:

- `..\release-builds\achmage-markdown-renderer`
- `..\release-builds\achmage-markdown-renderer-runtime`
- `..\release-builds\achmage-markdown-renderer-runtime-4.0.0.zip`

## 3. 브랜치로 올릴 때 예시

```powershell
git checkout -b codex/cyber-sanctuary-v4
git add .
git commit -m "release: prepare v4"
git push -u origin codex/cyber-sanctuary-v4
```

## 4. 태그가 필요하면

```powershell
git tag v4.0.0
git push origin v4.0.0
```

## 5. ZIP 사용자 기준 확인 포인트

GitHub에서 저장소 ZIP만 내려받아도 아래 흐름이 안내되어야 합니다.

1. 압축 해제
2. `launch-viewer.cmd` 실행
3. 첫 실행 시 자동 설치
4. vault 경로 입력
5. 브라우저 오픈

즉, README는 항상 "비개발자도 ZIP만 받아 바로 쓸 수 있는가"를 기준으로 유지합니다.
