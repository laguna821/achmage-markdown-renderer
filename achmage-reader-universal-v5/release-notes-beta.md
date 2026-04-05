Achmage Markdown Renderer v5 Universal Beta

- Windows installer `.exe`
- Windows portable `.zip`
- macOS installer `.dmg`
- macOS portable `.app.zip`
- `release-manifest.json`
- `SHA256SUMS.txt`

Notes

- Restore ToC active-heading sync to the exact `cmd v4` model and remove the beta.15 self-advancing progression layer.
- Keep the desktop ToC on the single rail scroll root so active items follow the article without the panel fighting its own scroll container.
- Revert desktop ToC tracking to the single-scroll-root `cmd v4` model so active links follow the article without abrupt jumps.
- Fix ToC active-link sync to follow the legacy v4 viewer behavior more closely, including mobile reveal alignment.
- Remove extra inline-code highlight styling from fenced code blocks in both light and dark themes.
- This beta release is unsigned on both Windows and macOS.
- macOS artifacts are built as `universal-apple-darwin`.
- The app is read-focused: it indexes and renders vault content but does not edit Markdown files.
