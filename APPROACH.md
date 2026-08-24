# Approach

Kept it entirely client-side — React, TypeScript, Vite, pdf.js for parsing, Tesseract.js for
OCR. No backend meant no API keys, no cost, no rate limits, and files never leave the browser.

The part that took the most thought was preserving PDF formatting. pdf.js hands back text in
drawing order rather than reading order, so naively joining the items scrambles the output.
Instead I use each item's transform to rebuild the page geometrically: group glyphs into lines
by baseline, sort left to right, space by the real horizontal gaps, and break paragraphs where
the vertical gap is bigger than normal line spacing.

Nice side effect: if a page's text layer comes back basically empty, it's almost certainly a
scan, so that page gets rasterized and OCR'd automatically — image-only PDFs just work.

For scoring, I went with explainable rules instead of an LLM call: seven scorers (hook,
engagement, length, readability, discoverability, tone, formatting) each produce a score and
the suggestions behind it, combined into one weighted total. Every result is deterministic and
explainable in a sentence — no black box, and edits re-score instantly since it's a pure
function of the text. Parsing engines load lazily to keep the initial bundle small.
