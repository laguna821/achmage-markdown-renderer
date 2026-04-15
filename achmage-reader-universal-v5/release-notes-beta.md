Achmage Markdown Renderer v6 Desktop Beta 9

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
- Desktop stage now measures and packs non-lead slides against ultra-v3 style `1280x720` body budgets so vertical pagination is driven by stage surface constraints instead of nested reader-shell cards.
- Non-lead stage frames now render through a dedicated `stage-surface` shell, removing the old `doc-section` wrapper so continued slides use the full paper instead of showing a second card inside the slide.
- Summary, quote, evidence, prose, table, and image frames now sit directly on the stage surface, with packed body metadata controlling layout while solo-card focus scaling remains only a secondary refinement.
- Stage image frames still use contain-only fitting with runtime orientation detection, and lead slides keep the current document-header path.
- Move markdown link interception from React synthetic capture to native article-level click delegation so raw rendered anchors in the reader respond reliably.
- Keep internal note routes, in-document hash links, and external links on the same routing policy while adding dev-only link debug tracing for packaged runtime diagnosis.
- Add regression coverage for Korean wiki-link rendering and direct text-node clicks so note-to-note jumps stay locked for packaged builds.
- Render Pretext rich overlay links as real anchors with `href` plus `data-href` so visible wiki links and external links stay clickable in packaged runtime.
- Keep the overlay itself non-interactive while re-enabling pointer events only for overlay anchors, with regression coverage for internal and external link segments.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
