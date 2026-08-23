import { useCallback, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ACCEPT_ATTRIBUTE, MAX_FILE_BYTES } from '../lib/extract';
import type { ProgressUpdate } from '../lib/types';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
  progress: ProgressUpdate | null;
}

/**
 * Upload surface supporting both drag-and-drop and the native file picker.
 * The transparent file input covers the whole zone, so the entire card is
 * clickable and keyboard focus still lands on a real form control.
 */
export function FileDropzone({ onFile, busy, progress }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Nested dragenter/dragleave events fire for child elements too, so count
  // them instead of toggling a boolean that flickers.
  const dragDepth = useRef(0);
  const inputId = useId();

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (busy) return;
    dragDepth.current += 1;
    setDragging(true);
  }, [busy]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    // Required, otherwise the browser opens the file instead of dropping it.
    event.preventDefault();
    if (!busy) event.dataTransfer.dropEffect = 'copy';
  }, [busy]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (busy) return;

    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [busy, onFile]);

  const className = [
    'dropzone',
    dragging ? 'is-dragging' : '',
    busy ? 'is-busy' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {busy ? (
        <>
          <div className="spinner" role="status" aria-label="Processing your file" />
          <div className="progress">
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                progress?.progress !== undefined
                  ? Math.round(progress.progress * 100)
                  : undefined
              }
            >
              <div
                className={`progress-fill${progress?.progress === undefined ? ' is-indeterminate' : ''}`}
                style={
                  progress?.progress !== undefined
                    ? { width: `${Math.round(progress.progress * 100)}%` }
                    : undefined
                }
              />
            </div>
            <p className="progress-label" aria-live="polite">
              {progress?.message ?? 'Working…'}
            </p>
          </div>
        </>
      ) : (
        <>
          <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V4m0 0L8 8m4-4 4 4M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3>Drop a PDF or image here</h3>
          <p>
            or <label htmlFor={inputId} style={{ textDecoration: 'underline', cursor: 'pointer' }}>browse your files</label>
            {' '}&middot; PDF, PNG, JPG, WebP, BMP, TIFF &middot; up to {MAX_FILE_BYTES / 1024 / 1024} MB
          </p>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            aria-label="Upload a PDF or image file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              // Reset so re-selecting the same file fires change again.
              event.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}
