---
title: "Overflow Lab"
docType: "note"
outputs: ["reader"]
summary: "Overflow reproduction for reader content blocks."
---

# Overflow Lab

## Wide Media

![Overflow grid](/overflow-grid.svg)

## Callout Stress

> [!NOTE] Layout width should stay inside the reader column
> this-callout-contains-a-deliberately-long-token-to-force-min-content-sizing-without-breaking-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

## Code Stress

```
const overflowToken = "this-is-a-very-long-code-line-that-should-scroll-inside-the-code-box-instead-of-expanding-the-entire-reader-column-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
```

## Regular Prose

The image, callout, and code block should all stay inside the main reader column.
