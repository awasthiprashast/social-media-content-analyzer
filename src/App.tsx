import { useCallback, useMemo, useRef, useState } from 'react';
import { FileDropzone } from './components/FileDropzone';
import { MetricsPanel } from './components/MetricsPanel';
import { PlatformSelector } from './components/PlatformSelector';
import { ScorePanel } from './components/ScorePanel';
import { SuggestionList } from './components/SuggestionList';
import { TextPanel } from './components/TextPanel';
import { analyze } from './lib/analyze';
import { ExtractionError, extractText } from './lib/extract';
import { SAMPLES } from './lib/samples';
import type { ExtractionResult, PlatformId, ProgressUpdate } from './lib/types';

export default function App() {
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<PlatformId>('linkedin');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first upload overwriting a newer one that finished
  // first, which is easy to trigger by dropping a second file mid-OCR.
  const runId = useRef(0);

  const handleFile = useCallback(async (file: File) => {
    const currentRun = ++runId.current;
    setBusy(true);
    setError(null);
    setProgress({ stage: 'reading', message: 'Opening the file…' });

    try {
      const result = await extractText(file, (update) => {
        if (runId.current === currentRun) setProgress(update);
      });
      if (runId.current !== currentRun) return;

      setExtraction(result);
      setText(result.text);
    } catch (cause) {
      if (runId.current !== currentRun) return;
      setError(
        cause instanceof ExtractionError
          ? cause.message
          : `Unexpected error: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      setExtraction(null);
    } finally {
      if (runId.current === currentRun) {
        setBusy(false);
        setProgress(null);
      }
    }
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    setText('');
    setExtraction(null);
    setError(null);
    setProgress(null);
    setBusy(false);
  }, []);

  // Analysis is pure and fast (sub-millisecond for post-sized text), so it can
  // simply be derived from state rather than stored and kept in sync.
  const analysis = useMemo(
    () => (text.trim() ? analyze(text, platform) : null),
    [text, platform],
  );

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <div>
            <h1>Social Media Content Analyzer</h1>
            <p>
              Drop in a PDF or a screenshot of a post. It pulls out the text and tells you
              what's working and what isn't before you hit publish.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          <div>
            <strong>Could not process that file</strong>
            {error}
          </div>
        </div>
      )}

      {extraction?.warnings.map((warning) => (
        <div className="banner banner-warn" key={warning} role="status">
          <div>{warning}</div>
        </div>
      ))}

      <div className="layout">
        <div>
          <section className="card">
            <FileDropzone onFile={handleFile} busy={busy} progress={progress} />
            {!text && !busy && (
              <div className="samples">
                <span className="hint" style={{ margin: 0, alignSelf: 'center' }}>
                  No file handy?
                </span>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    className="btn"
                    onClick={() => {
                      setExtraction(null);
                      setError(null);
                      setPlatform(sample.platform);
                      setText(sample.text);
                    }}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <PlatformSelector value={platform} onChange={setPlatform} />

          <TextPanel
            text={text}
            onChange={setText}
            extraction={extraction}
            onReset={reset}
          />
        </div>

        <div>
          {analysis ? (
            <>
              <ScorePanel analysis={analysis} />
              <SuggestionList suggestions={analysis.suggestions} />
              <MetricsPanel metrics={analysis.metrics} />
            </>
          ) : (
            <section className="card">
              <div className="empty">
                <h3>No text yet</h3>
                <p>
                  Upload a document or paste a post, and the analysis will appear here
                  instantly.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

    </div>
  );
}
