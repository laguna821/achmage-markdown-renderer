Achmage Markdown Renderer v5 Universal Beta

- Windows installer `.msi`
- Windows portable `.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Windows release assets ship as two public variants: WiX `.msi` and portable `.zip`.
- Windows MSI installers use Tauri's offline WebView2 installer path so a fresh PC does not need to download WebView2 during setup.
- Portable `.zip` remains available as a fallback path when the installer is blocked or WebView2 is already present.
- Restore `THESIS` and `docQuote` reader blocks to native HTML rendering so long multi-paragraph content grows correctly instead of overflowing through the next block.
- Keep Obsidian wikilinks and markdown anchors clickable inside `THESIS` and `docQuote` blocks by preserving real `<a href>` elements in the rendered reader markup.
- This beta release is unsigned on Windows.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
