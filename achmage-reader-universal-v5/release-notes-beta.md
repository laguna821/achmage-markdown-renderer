Achmage Markdown Renderer v5 Universal Beta

- Windows installer `.msi`
- Windows portable `.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Windows release assets ship as two public variants: WiX `.msi` and portable `.zip`.
- Windows MSI installers use Tauri's offline WebView2 installer path so a fresh PC does not need to download WebView2 during setup.
- Portable `.zip` remains available as a fallback path when the installer is blocked or WebView2 is already present.
- Move markdown link interception from React synthetic capture to native article-level click delegation so raw rendered anchors in the reader respond reliably.
- Keep internal note routes, in-document hash links, and external links on the same routing policy while adding dev-only link debug tracing for packaged runtime diagnosis.
- Add regression coverage for Korean `[[위키링크]]` rendering and direct text-node clicks so note-to-note jumps stay locked for packaged builds.
- This beta release is unsigned on Windows.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
