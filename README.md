# Social Media Content Analyzer

Upload a PDF or an image of a social media post. The app extracts the text — parsing the
PDF's text layer, or falling back to OCR for scans and screenshots — then scores the post
and gives specific, actionable suggestions for improving engagement.

Everything runs in the browser. No backend, no API keys, and no file ever leaves the device.

**Live app:** _(add your deployed URL here)_

---

## Features

**Document upload**
- Drag-and-drop *and* a native file picker (the whole drop area is clickable)
- PDF, PNG, JPG, WebP, BMP and TIFF, up to 20 MB
- Files are validated before any parsing engine is downloaded, so a wrong file is rejected instantly

**Text extraction**
- **PDF parsing** that preserves formatting. Rather than concatenating pdf.js text items in
  drawing order, the parser reads each item's affine transform and rebuilds the page
  geometrically: items are grouped into lines by baseline, ordered left-to-right, spaced
  according to real horizontal gaps, and split into paragraphs where the vertical gap exceeds
  normal line spacing.
- **OCR** via Tesseract.js for image files.
- **Automatic OCR fallback for scanned PDFs.** A page whose text layer is effectively empty is
  rasterised and passed through OCR, so image-only PDFs work without the user doing anything.
- Reports OCR confidence, and warns when it is low enough that the text should be checked.

**Analysis**
- A weighted 0–100 engagement score across seven categories: hook, engagement, length fit,
  readability, discoverability, tone and formatting
- Suggestions sorted by severity, each explaining *why* and often showing a concrete example
- Per-platform targets for X/Twitter, LinkedIn, Instagram and Facebook — the same text scores
  differently on each
- Metrics panel: Flesch reading ease, Flesch–Kincaid grade level, sentiment, hashtags,
  mentions, emoji, reading time and more
- The extracted text is editable, and the analysis re-runs as you type

**UX and robustness**
- Distinct loading states for every stage: reading, parsing, rendering, downloading the OCR
  model, and recognising — with real progress where progress is knowable
- Every failure mode produces a plain-English message that says what to do next
- Light and dark themes, responsive layout, keyboard accessible, respects reduced-motion
- An error boundary catches anything unexpected instead of showing a blank page

---

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

Requires Node 20.19+ (or 22.12+), which Vite 8 needs.

---

## How it works

```
src/
  lib/
    extract/
      index.ts     validation, routing, error normalisation, lazy loading
      pdf.ts       pdf.js parsing + geometric layout reconstruction
      ocr.ts       Tesseract worker lifecycle and progress reporting
    analyze/
      metrics.ts   tokenising, readability, sentiment, pattern counts
      rules.ts     seven category scorers, each returning a score + suggestions
      lexicon.ts   the word lists and regex patterns the rules match against
      platforms.ts per-platform length, hashtag and preview targets
      index.ts     combines categories into one weighted score
    types.ts       shared domain types
    samples.ts     two contrasting demo posts
  components/      presentational React components
  App.tsx          state, orchestration, error handling
```

Two design decisions are worth calling out.

**The analysis is a pure function.** `analyze(text, platform)` has no I/O and no async work, so
the result is simply derived from state with `useMemo` rather than stored and kept in sync.
Editing the text or switching platforms re-runs it instantly.

**The heavy engines load on demand.** pdf.js and Tesseract are several hundred kilobytes
between them, so `extractText` imports them dynamically. The app shell is 73 kB gzipped and
the parsing code only arrives once there is a file that needs it.

### Scoring

Each of the seven categories is scored 0–100 independently, then combined:

| Category | Weight | What it looks at |
| --- | --- | --- |
| Hook | 20% | Opening line: question, number, or bold claim; does it survive the preview cut-off |
| Engagement | 20% | Call to action, reader question, concrete numbers, link penalties |
| Length fit | 15% | Character count against the platform's sweet spot and hard limit |
| Readability | 15% | Flesch reading ease, sentence length, filler words, passive voice, jargon |
| Discoverability | 12% | Hashtag count against platform norms, overly generic tags, mentions |
| Tone | 10% | Sentiment, exclamation and capitals overuse, emoji balance |
| Formatting | 8% | Paragraph structure, walls of text, list opportunities |

The rules are heuristics drawn from published engagement research, not a trained model. That
is a deliberate trade-off: every score can be explained in one sentence, the result is
identical for identical input, and there is no API key, no cost and no rate limit.

---

## Tech stack

React 19, TypeScript and Vite. Two runtime dependencies:

- [`pdfjs-dist`](https://github.com/mozilla/pdf.js) — PDF parsing and page rasterisation
- [`tesseract.js`](https://github.com/naptha/tesseract.js) — OCR

Tesseract downloads its English language model (~15 MB) from a CDN on first use and the
browser caches it, which keeps the repository small.

---

## Notes and limitations

- OCR quality depends on the source image. Low-resolution or low-contrast scans produce worse
  text, so the app surfaces the confidence score and warns below 60%.
- The lexicons are English-only.
- Platform sweet spots are rules of thumb from public engagement studies, and the UI presents
  them that way rather than as guarantees.
- Scanned PDFs are OCR'd one page at a time, so a long scanned document takes a few seconds
  per page.
