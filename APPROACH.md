# Approach

I built the whole thing client-side: React, TypeScript and Vite, with pdf.js for parsing and
Tesseract.js for OCR. No backend means no keys, no cost, no rate limits, and files never leave
the user's device — which also made deployment a static build.

The interesting problem was preserving formatting. pdf.js returns text in drawing order, not
reading order, so concatenating it yields scrambled output. Instead I keep each item's affine
transform and rebuild the page geometrically: group items into lines by baseline, sort
left-to-right, insert spaces where the horizontal gap exceeds a space width, and break
paragraphs where the vertical gap exceeds normal line spacing.

That gave a second win. If a page's text layer is effectively empty, it's a scan, so the page
is rasterised and sent through OCR automatically — image-only PDFs work with no extra step.

For analysis I chose explainable heuristics over an LLM. Seven scorers — hook, engagement,
length, readability, discoverability, tone, formatting — each return a score and the
suggestions justifying it, combined into a weighted total. Every result is deterministic and
explainable in one sentence.

`analyze()` is pure, so editing the text re-scores instantly. The heavy engines load on
demand, keeping the shell at 73 kB.
