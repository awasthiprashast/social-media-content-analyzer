import { createWorker, type Worker } from 'tesseract.js';
import type { ProgressHandler } from '../types';

/**
 * Tesseract spins up a WebAssembly worker and downloads a ~15 MB language
 * model on first use. Both are expensive, so the worker is created once and
 * reused for the rest of the session.
 */
let workerPromise: Promise<Worker> | null = null;

/** Tesseract reports many stages; only these map onto visible progress. */
const RECOGNIZE_STAGES = new Set(['recognizing text']);

function getWorker(onProgress?: ProgressHandler): Promise<Worker> {
  if (!workerPromise) {
    onProgress?.({
      stage: 'recognizing',
      message: 'Loading the OCR engine (one-time, ~15 MB)…',
    });

    workerPromise = createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (RECOGNIZE_STAGES.has(m.status)) return; // reported per-page instead
        onProgress?.({
          stage: 'recognizing',
          progress: m.progress,
          message: describeStatus(m.status),
        });
      },
    }).catch((error) => {
      // Let the next attempt retry from scratch rather than caching a failure.
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

function describeStatus(status: string): string {
  switch (status) {
    case 'loading tesseract core':
      return 'Loading the OCR engine…';
    case 'loading language traineddata':
    case 'loading language traineddata (from cache)':
      return 'Downloading the English language model…';
    case 'initializing tesseract':
    case 'initializing api':
      return 'Starting the OCR engine…';
    default:
      return 'Preparing OCR…';
  }
}

export interface OcrOutput {
  text: string;
  confidence: number;
}

/** Run OCR over any image source Tesseract accepts (File, Blob, or canvas). */
export async function recognize(
  image: File | Blob | HTMLCanvasElement,
  onProgress?: ProgressHandler,
  label = 'Reading text from the image…',
): Promise<OcrOutput> {
  const worker = await getWorker(onProgress);
  onProgress?.({ stage: 'recognizing', message: label });

  const { data } = await worker.recognize(image);
  return {
    text: normalizeOcrText(data.text ?? ''),
    confidence: data.confidence ?? 0,
  };
}

/**
 * OCR output is noisy at the whitespace level: trailing spaces on every line,
 * stray blank lines between rows of the same paragraph, and hyphenated words
 * broken across lines. Clean those up without collapsing real paragraphs.
 */
function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Release the worker and its memory, e.g. when the user resets the app. */
export async function disposeOcr(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // Nothing useful to do if a worker that never started fails to stop.
  }
}
