---
title: "Stage Navigation Lab"
docType: "note"
outputs: ["reader"]
summary: "Universal stage mode should work for reader-only documents, including horizontal section navigation and vertical continuation frames."
heroLabel: "Stage Lab"
---

# Stage Navigation Lab

This lab exists to verify that the new stage mode can open any note, even when the note only advertises `reader` in frontmatter.

## Dense First Section

The first section is intentionally verbose so the stage paginator has to create continued frames instead of trying to cram everything into one view. The content should keep its reading rhythm while still respecting the full-bleed presentation shell.

This second paragraph keeps the same cadence on purpose. It gives the paginator another independent prose fragment to measure, which makes the continuation behavior deterministic instead of relying on one giant paragraph to overflow.

This third paragraph is here to force a continuation frame in the browser-facing sample document. It also mirrors the real writing pattern you described: long-form markdown that should stay natural in the editor and only become slides at render time.

This fourth paragraph continues the stress case. The renderer should preserve order, keep the section title visible on the continued frame, and move vertically inside the same horizontal group before advancing to the next section.

This fifth paragraph keeps the frame count high enough for keyboard navigation checks. Arrow down and space should move within this section before arrow right or end jumps to the next horizontal slide.

## Closing Section

The closing section is shorter on purpose so we can verify that horizontal navigation lands on a simple one-frame group after the longer vertically paginated section.
