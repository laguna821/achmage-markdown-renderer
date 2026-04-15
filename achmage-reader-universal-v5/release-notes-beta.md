Achmage Markdown Renderer v6 Desktop Beta 8

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
- Stage now reflows isolated `Summary / Key Trigger`, `Quote`, thesis, provenance, log, and other solo card-like frames after pagination so they use the slide at stage scale instead of reader scale.
- Solo card frames now carry `focus-card` intent plus bounded focus scaling metadata so the desktop renderer can safely enlarge card footprint and typography without overflowing the paper.
- Desktop stage now exposes explicit stage-only block hooks for card-like blocks, letting focus-card slides use dedicated layout and typography rules without changing reader or newsletter styling.
- Stage image frames still use contain-only fitting with runtime orientation detection, and sparse / header-only slides keep the beta.7 paper-usage improvements.
- Move markdown link interception from React synthetic capture to native article-level click delegation so raw rendered anchors in the reader respond reliably.
- Keep internal note routes, in-document hash links, and external links on the same routing policy while adding dev-only link debug tracing for packaged runtime diagnosis.
- Add regression coverage for Korean wiki-link rendering and direct text-node clicks so note-to-note jumps stay locked for packaged builds.
- Render Pretext rich overlay links as real anchors with `href` plus `data-href` so visible wiki links and external links stay clickable in packaged runtime.
- Keep the overlay itself non-interactive while re-enabling pointer events only for overlay anchors, with regression coverage for internal and external link segments.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
