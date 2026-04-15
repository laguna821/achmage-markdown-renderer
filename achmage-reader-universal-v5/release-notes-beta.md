Achmage Markdown Renderer v6 Desktop Beta 6

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
- This beta line ships the corrected desktop-native V6 universal stage integration.
- Stage now opens for every packaged desktop note, including reader-only notes.
- Desktop stage now uses a real full-bleed deck with horizontal groups and vertical continuation frames instead of the old scroll-highlight shell.
- Stage title and counters now live in a dock outside the slide instead of overlaying the paper, with a compact fallback on narrower widths.
- Stage image frames now use contain-only fitting with runtime orientation detection so large screenshots stay fully visible and portrait captures scale down more comfortably.
- Light theme stage section titles now render above the black divider rule, including continued frames, so the slide body recovers vertical space.
- Move markdown link interception from React synthetic capture to native article-level click delegation so raw rendered anchors in the reader respond reliably.
- Keep internal note routes, in-document hash links, and external links on the same routing policy while adding dev-only link debug tracing for packaged runtime diagnosis.
- Add regression coverage for Korean wiki-link rendering and direct text-node clicks so note-to-note jumps stay locked for packaged builds.
- Render Pretext rich overlay links as real anchors with `href` plus `data-href` so visible wiki links and external links stay clickable in packaged runtime.
- Keep the overlay itself non-interactive while re-enabling pointer events only for overlay anchors, with regression coverage for internal and external link segments.
- This beta release is unsigned on Windows and macOS.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
