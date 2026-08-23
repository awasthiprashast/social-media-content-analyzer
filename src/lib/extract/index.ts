import type { ExtractionResult, ProgressHandler } from '../types';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/bmp',
  'image/tiff',
] as const;

const ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'];

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',');

/** Thrown for problems the user can act on, so the UI can show them verbatim. */
export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Reject unsupported input before doing any expensive work. This runs in the
 * main bundle, so a wrong file is rejected instantly without downloading the
 * parsing engines.
 */
export function validateFile(file: File): void {
  if (file.size === 0) {
    throw new ExtractionError(`"${file.name}" is empty.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ExtractionError(
      `"${file.name}" is ${mb} MB. Please use a file under ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const ext = extensionOf(file.name);
  const mimeOk = (ACCEPTED_MIME as readonly string[]).includes(file.type);
  // Some browsers report an empty MIME type for drag-and-drop, so the
  // extension is a fallback rather than a second requirement.
  if (!mimeOk && !ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new ExtractionError(
      `"${file.name}" is not a supported file. Upload a PDF or an image (PNG, JPG, WebP, BMP, TIFF).`,
    );
  }
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || extensionOf(file.name) === 'pdf';
}

/**
 * Extract text from a PDF or image, reporting progress as it goes.
 *
 * pdf.js and Tesseract together are several hundred kilobytes, so both are
 * imported dynamically: the app shell loads instantly and the engine only
 * arrives once there is a file that needs it.
 */
export async function extractText(
  file: File,
  onProgress?: ProgressHandler,
): Promise<ExtractionResult> {
  validateFile(file);
  const startedAt = performance.now();

  try {
    if (isPdf(file)) {
      onProgress?.({ stage: 'reading', message: 'Loading the PDF engine…' });
      const { extractPdf } = await import('./pdf');
      const pdf = await extractPdf(file, onProgress);
      const text = pdf.blocks.map((block) => block.text).join('\n\n');

      if (!text.trim()) {
        throw new ExtractionError(
          'No readable text was found in this PDF. If it is a scan, try a higher-resolution copy.',
        );
      }

      return {
        kind: 'pdf',
        fileName: file.name,
        text,
        blocks: pdf.blocks,
        pageCount: pdf.pageCount,
        usedOcr: pdf.usedOcr,
        ocrConfidence: pdf.ocrConfidence,
        durationMs: performance.now() - startedAt,
        warnings: pdf.warnings,
      };
    }

    onProgress?.({ stage: 'reading', message: 'Loading the OCR engine…' });
    const { recognize } = await import('./ocr');
    const ocr = await recognize(file, onProgress);

    if (!ocr.text.trim()) {
      throw new ExtractionError(
        'No text was found in this image. Try a sharper or higher-contrast screenshot.',
      );
    }

    const warnings: string[] = [];
    if (ocr.confidence < 60) {
      warnings.push(
        `OCR confidence is low (${Math.round(ocr.confidence)}%). Check the extracted text for mistakes before trusting the analysis.`,
      );
    }

    return {
      kind: 'image',
      fileName: file.name,
      text: ocr.text,
      blocks: [{ page: 1, text: ocr.text }],
      pageCount: 1,
      usedOcr: true,
      ocrConfidence: ocr.confidence,
      durationMs: performance.now() - startedAt,
      warnings,
    };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    if (/password|encrypted/i.test(message)) {
      throw new ExtractionError('This PDF is password-protected. Remove the password and try again.');
    }
    if (/invalid|corrupt|structure|missing pdf/i.test(message)) {
      throw new ExtractionError(`"${file.name}" could not be opened. The file may be corrupted.`);
    }
    if (/attempting to read image|unsupported image|decode/i.test(message)) {
      throw new ExtractionError(
        `"${file.name}" could not be read as an image. The file may be corrupted, or may not be an image despite its name.`,
      );
    }
    throw new ExtractionError(`Could not read "${file.name}". ${message}`);
  }
}

/** Release the OCR worker, if one was ever started. */
export async function disposeOcr(): Promise<void> {
  const ocr = await import('./ocr');
  await ocr.disposeOcr();
}
