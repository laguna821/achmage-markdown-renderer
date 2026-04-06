Achmage Markdown Renderer v5 Universal Beta

- Windows installer `.msi`
- Windows portable `.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Windows release assets ship as two public variants: WiX `.msi` and portable `.zip`.
- Windows MSI installers use Tauri's offline WebView2 installer path so a fresh PC does not need to download WebView2 during setup.
- Portable `.zip` remains available as a fallback path when the installer is blocked or WebView2 is already present.
- Fix inline markdown links so clicking the text node itself still resolves the surrounding anchor and navigates immediately.
- Keep internal note routes, in-document hash links, and external links on the same routing policy while expanding click-target detection to Text-node and composedPath cases.
- This beta release is unsigned on Windows.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
