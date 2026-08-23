import { useEffect, useState } from 'react';
import type { ExtractionResult } from '../lib/types';

interface Props {
  text: string;
  onChange: (text: string) => void;
  extraction: ExtractionResult | null;
  onReset: () => void;
}

/**
 * Shows the extracted text in an editable field. Editing re-runs the analysis
 * immediately, which turns the tool from a one-shot report into something you
 * can iterate a draft in.
 */
export function TextPanel({ text, onChange, extraction, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked; the text is selectable either way.
      setCopied(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Extracted text</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={copy} disabled={!text}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Clear
          </button>
        </div>
      </div>

      {extraction && (
        <div className="meta-row">
          <span className="chip">{extraction.fileName}</span>
          <span className="chip">
            {extraction.kind === 'pdf'
              ? `PDF · ${extraction.pageCount} page${extraction.pageCount === 1 ? '' : 's'}`
              : 'Image'}
          </span>
          <span className="chip chip-accent">
            {extraction.usedOcr ? 'OCR (Tesseract)' : 'Native text layer'}
          </span>
          {extraction.ocrConfidence !== undefined && (
            <span className="chip">{Math.round(extraction.ocrConfidence)}% confidence</span>
          )}
          <span className="chip">{(extraction.durationMs / 1000).toFixed(1)}s</span>
        </div>
      )}

      <label className="sr-only" htmlFor="extracted-text">Extracted text</label>
      <textarea
        id="extracted-text"
        className="editor"
        value={text}
        spellCheck={false}
        placeholder="Upload a file, or paste a post here to analyse it."
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="hint">Edit the text and the analysis updates as you type.</p>
    </section>
  );
}
