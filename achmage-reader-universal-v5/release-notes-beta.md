Achmage Markdown Renderer v6 Desktop Beta 12

- Windows installer `.msi`
- Windows portable `.zip`
- macOS installer `.dmg`
- macOS portable `.app.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Windows release assets ship as two public variants: WiX `.msi` and portable `.zip`.
- macOS release assets ship as two public variants: universal `.dmg` and `.app.zip`.
- Windows MSI installers use Tauri's offline WebView2 installer path so a fresh PC does not need to download WebView2 during setup.
- Portable `.zip` remains available as a fallback path when the installer is blocked or WebView2 is already present.
- This beta release hardens vault loading across the desktop line, including the packaged macOS app path.
- Desktop vault opening now uses a strict two-phase loader: metadata scan first, batched markdown validation second, then document exposure only after validation completes.
- Large vaults no longer rely on eager full-snapshot bootstrap reads, and the app now records a `vault-load-report.json` diagnostic file in app data for triage.
- Invalid YAML, slug collisions, markdown parsing failures, and snapshot read failures now block with an explicit diagnostic panel instead of degrading into a blank app surface.
- Added a root error boundary plus lazy home-search indexing so large vault startup has clearer runtime failure handling and less eager work on first render.
- Release CI now runs `npm test` before packaging on both Windows and macOS so prerelease artifacts cannot skip the desktop regression suite.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
