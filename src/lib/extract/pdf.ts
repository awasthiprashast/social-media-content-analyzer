import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ProgressHandler, TextBlock } from '../types';
import { recognize } from './ocr';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Below this many characters a page is treated as scanned rather than digital. */
const SCANNED_PAGE_CHAR_THRESHOLD = 12;

/**
 * Target width in pixels when rasterising a page for OCR. Tesseract needs a
 * reasonable pixel density to be accurate, and this is scaled to hit the target
 * regardless of the page's own dimensions.
 */
const OCR_TARGET_WIDTH = 2000;
const OCR_MIN_SCALE = 1.5;
const OCR_MAX_SCALE = 4;

export interface PdfExtraction {
  blocks: TextBlock[];
  pageCount: number;
  usedOcr: boolean;
  ocrConfidence?: number;
  warnings: string[];
}

interface PositionedItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Width of a single space in this item's font, used for gap detection. */
  spaceWidth: number;
}

export async function extractPdf(
  file: File,
  onProgress?: ProgressHandler,
): Promise<PdfExtraction> {
  onProgress?.({ stage: 'reading', message: 'Reading the PDF…' });
  const data = new Uint8Array(await file.arrayBuffer());

  // Keep the loading task: it owns the worker, and destroying it is what
  // actually releases the memory once the document has been read.
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const blocks: TextBlock[] = [];
  const warnings: string[] = [];
  const confidences: number[] = [];
  let usedOcr = false;

  try {
    for (let pageNo = 1; pageNo <= pageCount; pageNo++) {
      onProgress?.({
        stage: 'parsing',
        progress: (pageNo - 1) / pageCount,
        message: `Extracting text from page ${pageNo} of ${pageCount}…`,
      });

      const page = await doc.getPage(pageNo);
      try {
        const content = await page.getTextContent();
        const items = toPositionedItems(content.items as TextItem[]);
        let text = reconstructLayout(items);

        // A page with no meaningful text layer is almost certainly a scan.
        if (text.replace(/\s/g, '').length < SCANNED_PAGE_CHAR_THRESHOLD) {
          const ocr = await ocrPage(page, pageNo, pageCount, onProgress);
          if (ocr && ocr.text) {
            text = ocr.text;
            confidences.push(ocr.confidence);
            usedOcr = true;
          } else {
            warnings.push(`Page ${pageNo} appears to be blank.`);
          }
        }

        if (text.trim()) blocks.push({ page: pageNo, text });
      } catch (error) {
        warnings.push(
          `Page ${pageNo} could not be read (${errorMessage(error)}). It was skipped.`,
        );
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return {
    blocks,
    pageCount,
    usedOcr,
    ocrConfidence: confidences.length ? average(confidences) : undefined,
    warnings,
  };
}

/** Rasterise a page and OCR it, for PDFs that contain images instead of text. */
async function ocrPage(
  page: pdfjs.PDFPageProxy,
  pageNo: number,
  total: number,
  onProgress?: ProgressHandler,
): Promise<{ text: string; confidence: number } | null> {
  onProgress?.({
    stage: 'rendering',
    progress: (pageNo - 1) / total,
    message: `Page ${pageNo} looks scanned — rendering it for OCR…`,
  });

  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(
    OCR_MAX_SCALE,
    Math.max(OCR_MIN_SCALE, OCR_TARGET_WIDTH / base.width),
  );
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) return null;

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
    // "print" intent renders synchronously. The default "display" intent
    // schedules its work through requestAnimationFrame, which never fires
    // while the tab is in the background - so a user who switches tabs
    // mid-upload would otherwise wait forever.
    intent: 'print',
  }).promise;

  const result = await recognize(
    canvas,
    onProgress,
    `Running OCR on page ${pageNo} of ${total}…`,
  );

  // Free the bitmap immediately; multi-page scans add up fast.
  canvas.width = 0;
  canvas.height = 0;

  return result;
}

/**
 * pdf.js returns text in drawing order, which is not reading order. Each item
 * carries an affine transform, so we keep the coordinates and rebuild the page
 * geometrically instead of trusting the array order.
 */
function toPositionedItems(items: TextItem[]): PositionedItem[] {
  return items
    .filter((item) => typeof item.str === 'string' && item.str.length > 0)
    .map((item) => {
      const [scaleX, , , , x, y] = item.transform as number[];
      const height = Math.abs(item.height || scaleX) || 1;
      return {
        text: item.str,
        x,
        y,
        width: item.width ?? 0,
        height,
        // pdf.js does not expose the space advance, so approximate it from the
        // font size. 0.25em is a reasonable average across common faces.
        spaceWidth: height * 0.25,
      };
    });
}

/**
 * Group items into lines by baseline, order each line left-to-right, and insert
 * paragraph breaks where the vertical gap exceeds normal line spacing. This is
 * what preserves the shape of the original document rather than flattening it.
 */
function reconstructLayout(items: PositionedItem[]): string {
  if (items.length === 0) return '';

  const medianHeight = median(items.map((i) => i.height)) || 10;
  // Items whose baselines differ by less than half a line belong together.
  const lineTolerance = medianHeight * 0.5;

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedItem[][] = [];

  for (const item of sorted) {
    const current = lines[lines.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= lineTolerance) {
      current.push(item);
    } else {
      lines.push([item]);
    }
  }

  const rendered = lines.map((line) => {
    const ordered = [...line].sort((a, b) => a.x - b.x);
    let text = '';
    let cursorX: number | null = null;

    for (const item of ordered) {
      if (cursorX !== null) {
        const gap = item.x - cursorX;
        // A gap wider than a space means the glyphs were visually separated,
        // e.g. columns or tab stops. Anything smaller is already spaced.
        if (gap > item.spaceWidth && !/\s$/.test(text) && !/^\s/.test(item.text)) {
          text += gap > item.spaceWidth * 6 ? '   ' : ' ';
        }
      }
      text += item.text;
      cursorX = item.x + item.width;
    }
    return { text: text.replace(/\s+$/, ''), y: line[0].y, height: median(line.map((i) => i.height)) };
  });

  const out: string[] = [];
  for (let i = 0; i < rendered.length; i++) {
    const line = rendered[i];
    if (i > 0) {
      const gap = rendered[i - 1].y - line.y;
      const expected = Math.max(line.height, rendered[i - 1].height) * 1.6;
      // An unusually tall gap is a paragraph or section break, not a new line.
      if (gap > expected) out.push('');
    }
    out.push(line.text);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
