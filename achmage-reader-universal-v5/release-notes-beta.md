Achmage Markdown Renderer v6 Desktop Beta 10

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
- This beta line keeps the desktop-native V6 universal stage integration and ultra-v3 navigation baseline intact.
- Desktop stage now uses a full-viewport stage canvas with direct slide surfaces, replacing the remaining reader-style shell assumptions that caused first-slide alignment drift and underfilled layouts.
- Lead slides render through a dedicated stage header path, while non-lead slides use the shared `stage-surface` shell so centered and sparse frames balance against the actual stage viewport instead of nested paper cards.
- Continued vertical pagination now renders inline title suffixes as `(cont.)`, avoiding reader-style title decorations and keeping stage headings consistent across themes.
- Added bounded stage typography scaling and updated pagination measurement budgets so short frames, solo-card frames, and continued groups fit more predictably without regressing navigation semantics.
- Tuned the non-light theme `READER / STAGE` mode switch skin so dark, aurora, and cyber sanctuary top-bar chrome uses theme-matched surfaces instead of the previous bright white pill treatment.
- Added regression coverage for stage canvas geometry, continued-title formatting, stage-only lead shells, vertical balance, and themed mode-switch styling.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
