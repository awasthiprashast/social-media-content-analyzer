# Social Media Content Analyzer

[![CI](https://github.com/awasthiprashast/social-media-content-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/awasthiprashast/social-media-content-analyzer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

Upload a PDF or a screenshot of a social post and get back an engagement score plus concrete
suggestions for improving it. Text comes out of the PDF's own text layer when there is one,
and falls back to OCR (Tesseract) for scans, screenshots, or images.

No backend. Parsing, OCR, and scoring all run in the browser, so nothing you upload ever
leaves your machine. (The one-time OCR engine and English language model are fetched from a
public CDN on first use; your files are never uploaded.)

**Live app:** https://social-media-content-analyzer-kappa-five.vercel.app/

## Running it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173. Needs Node 20.19+ (or 22.12+) for Vite 8.

```bash
npm run build     # typecheck + production build to dist/
npm run preview   # serve that build locally
npm run typecheck
npm run lint
```

## What it does

Upload flow supports drag-and-drop or the file picker, PDF/PNG/JPG/WebP/BMP/TIFF up to 20 MB.
Bad files get rejected immediately with a message, before any parsing library is even loaded.

PDF parsing was the fiddly part. pdf.js hands back text items in drawing order, not reading
order, so just concatenating them scrambles multi-column or multi-line pages. Instead the
parser uses each item's transform matrix to rebuild the page: group glyphs into lines by
baseline, sort each line left-to-right, insert spacing based on the actual horizontal gaps,
and break paragraphs wherever the vertical gap between lines is unusually large. That's what
keeps the extracted text looking like the source document instead of a word salad.

If a PDF page turns out to have basically no text layer (i.e. it's a scanned image saved as a
PDF), the page gets rendered to a canvas and OCR'd automatically. No separate "treat this as
an image" step needed from the user.

Once there's text, it gets scored 0–100 across seven weighted categories:

| Category | Weight | Checks |
|---|---|---|
| Hook | 20% | Does the opening line earn attention (question, number, bold claim) and survive the platform's preview cutoff |
| Engagement | 20% | CTA present, ends on a question, concrete numbers used, link reach penalty |
| Length fit | 15% | Character count vs. that platform's sweet spot and hard limit |
| Readability | 15% | Flesch reading ease, sentence length, filler words, passive voice |
| Discoverability | 12% | Hashtag count vs. platform norms, overly generic tags |
| Tone | 10% | Sentiment, exclamation/caps overuse, emoji balance |
| Formatting | 8% | Wall-of-text detection, paragraph structure |

Same text scores differently depending on the target platform (X/Twitter, LinkedIn, Instagram,
Facebook) since the character and hashtag targets differ per platform. There's also a metrics
panel below the suggestions with reading time, grade level, sentiment, hashtag/mention/link
counts, etc.

The extracted text sits in an editable box, and the score recalculates as you type. It's a
plain synchronous function of the text, so there's nothing to debounce or wait on.

## Why heuristics instead of an LLM call

Went back and forth on this. Ended up with hand-written scoring rules (regex/keyword based,
tuned against a couple dozen real and made-up posts) rather than calling out to a model,
mainly because it means zero API keys, zero cost, works offline, and every score can be
explained in one sentence instead of "the model said so." The tradeoff is it's English-only
and won't catch anything outside the patterns it knows about.

## Layout

Design notes live in [docs/APPROACH.md](docs/APPROACH.md).

```
src/
  lib/
    extract/
      index.ts     validation, routing, error messages, lazy-loads the engines below
      pdf.ts       pdf.js parsing + the layout reconstruction described above
      ocr.ts       Tesseract worker setup and progress events
    analyze/
      metrics.ts   tokenizing, readability/sentiment math, pattern counts
      rules.ts     the seven scorers, each returns a score + suggestions
      lexicon.ts   word lists / regexes the rules match against
      platforms.ts per-platform length & hashtag targets
      index.ts     combines it all into one weighted score
    types.ts
  components/      UI, mostly presentational
  App.tsx          state + wiring
```

pdf.js and Tesseract are both dynamically imported, only once a file actually needs them. The
initial JS payload is under 75 kB gzipped, and the parsing engines load on demand after that.

## Known limitations

- OCR accuracy depends entirely on the source image. Low-res or low-contrast scans produce
  messier text, and the app flags it when confidence drops below 60%.
- Scoring lexicons are English-only.
- The platform "sweet spot" numbers are rules of thumb pulled from public engagement studies,
  not hard guarantees, and the UI is worded that way.
- Scanned PDFs get OCR'd page by page, so a long scanned document takes a few seconds per page.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Prashast Awasthi
