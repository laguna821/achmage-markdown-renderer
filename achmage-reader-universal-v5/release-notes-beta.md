Achmage Markdown Renderer v6 Desktop Beta 11

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
- This beta release republishes the beta.10 stage stabilization baseline with the CI fix required for GitHub Actions release packaging.
- Desktop stage keeps the full-viewport stage canvas, dedicated lead header path, inline `(cont.)` continuation titles, and non-light mode-switch skin tuning introduced on the beta.10 line.
- Restored clean release builds by adding explicit Node typings for the desktop CSS regression test that reads `base.css` through `node:fs` during `tsc` in fresh `npm ci` environments.
- Kept stage geometry, continuation-title formatting, stage-only lead layout, vertical balance, and themed mode-switch regression coverage intact for the release pipeline.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
