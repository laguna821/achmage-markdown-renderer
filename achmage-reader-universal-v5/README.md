# Achmage Markdown Renderer v5 Universal Beta

Achmage Markdown Renderer is the desktop packaging line for the Markdown renderer. It keeps the existing `reader`, `stage`, and `newsletter` views, but removes the old "install dependencies on first launch" flow and moves distribution to a Tauri 2 desktop app.

## Current scope

- Windows installer: NSIS `.exe`
- Windows portable: `.zip`
- macOS installer: `.dmg`
- macOS portable: `.app.zip`
- Draft GitHub Release workflow with checksum generation

## Local development

```bash
npm install
npm run dev
npm run test
npm run build
```

## Local packaging

Windows:

```bash
npm run package:windows
npm run stage:release-assets -- --platform windows
npm run verify:release-assets -- --platform windows
npm run package:release-manifest
```

macOS:

```bash
npm run package:macos
npm run stage:release-assets -- --platform macos
npm run verify:release-assets -- --platform macos
npm run package:release-manifest
```

Convenience command for the local Windows beta path:

```bash
npm run release:beta
```

## Release workflow

In the repository integration layout, the GitHub Actions workflow lives at the repo root:

- `.github/workflows/release-achmage-reader-v5-beta.yml`

- `workflow_dispatch`: builds Windows and macOS artifacts and uploads them as workflow artifacts
- `push` tag matching `v5.*`: builds both platforms, generates `release-manifest.json` and `SHA256SUMS.txt`, and creates a draft prerelease

## Notes

- This beta build is unsigned on both Windows and macOS.
- macOS release builds use `universal-apple-darwin`.
- Windows packaging intentionally targets `nsis` only to avoid the MSI prerelease-version restriction.
