# Achmage Markdown Renderer v6 Universal Beta

Achmage Markdown Renderer is the desktop packaging line for the Markdown renderer. It keeps the existing `reader`, `stage`, and `newsletter` views, but removes the old "install dependencies on first launch" flow and moves distribution to a Tauri 2 desktop app.

## Current scope

- Windows installer: WiX `.msi`
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

- `workflow_dispatch`: builds Windows and macOS artifacts and can publish against an existing tag when `release_tag` is provided
- `push` tag matching `v6.*`: builds both platforms, generates `release-manifest.json` and `SHA256SUMS.txt`, and creates a public prerelease

## Notes

- This beta build is still unsigned on both Windows and macOS.
- Windows release assets now include two public paths:
  - WiX `.msi`
  - portable `.zip`
- The Windows `.msi` is built with Tauri's `offlineInstaller` WebView2 path, so a new PC does not need to download WebView2 during setup.
- The Windows portable `.zip` still assumes WebView2 is already available on the machine.
- Because the artifacts are unsigned, some new Windows PCs may still warn or block direct execution of internet-downloaded installers. In that case, the practical fallback is:
  - try the portable `.zip` after unblocking the downloaded file in Windows Properties or via `Unblock-File`
- macOS release builds use `universal-apple-darwin`.
