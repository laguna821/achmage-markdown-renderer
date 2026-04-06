Achmage Markdown Renderer v5 Universal Beta

- Windows installer `.msi`
- Windows portable `.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Windows release assets ship as two public variants: WiX `.msi` and portable `.zip`.
- Windows MSI installers use Tauri's offline WebView2 installer path so a fresh PC does not need to download WebView2 during setup.
- Portable `.zip` remains available as a fallback path when the installer is blocked or WebView2 is already present.
- Fix markdown link activation so Obsidian note links, in-document anchors, and external markdown links route reliably from the reader.
- Fix thesis, callout, and doc-quote boxes so longer titles and bodies wrap and grow instead of clipping or spilling outside the frame.
- This beta release is unsigned on Windows.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
