/** Shared domain types for extraction and analysis. */

export type SourceKind = 'pdf' | 'image';

/** A single logical block of text recovered from a document. */
export interface TextBlock {
  /** 1-based page number (images are always page 1). */
  page: number;
  text: string;
}

export interface ExtractionResult {
  kind: SourceKind;
  fileName: string;
  /** Layout-preserved plain text, ready to display or analyse. */
  text: string;
  blocks: TextBlock[];
  pageCount: number;
  /** True when OCR produced the text (image input, or a PDF with no text layer). */
  usedOcr: boolean;
  /** Mean OCR confidence 0-100, when OCR ran. */
  ocrConfidence?: number;
  /** Wall-clock duration of the extraction, in milliseconds. */
  durationMs: number;
  /** Non-fatal problems worth surfacing (e.g. one unreadable page). */
  warnings: string[];
}

export type ProgressStage =
  | 'reading'
  | 'parsing'
  | 'rendering'
  | 'recognizing'
  | 'analyzing'
  | 'done';

export interface ProgressUpdate {
  stage: ProgressStage;
  /** 0..1, or undefined when the step is indeterminate. */
  progress?: number;
  message: string;
}

export type ProgressHandler = (update: ProgressUpdate) => void;

export type PlatformId = 'twitter' | 'linkedin' | 'instagram' | 'facebook';

export type Severity = 'critical' | 'warning' | 'tip' | 'praise';

export type Category =
  | 'hook'
  | 'length'
  | 'readability'
  | 'engagement'
  | 'discoverability'
  | 'tone'
  | 'formatting';

export interface Suggestion {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  detail: string;
  /** Concrete example the user can copy, when one applies. */
  example?: string;
}

export interface CategoryScore {
  category: Category;
  /** 0..100 */
  score: number;
  /** Relative contribution to the overall score. */
  weight: number;
}

export interface Metrics {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  readingEase: number;
  gradeLevel: number;
  readingTimeSeconds: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  emojis: string[];
  questions: number;
  exclamations: number;
  allCapsWords: string[];
  longWords: number;
  numbers: number;
  sentiment: number;
  positiveHits: string[];
  negativeHits: string[];
  hasCta: boolean;
  ctaHits: string[];
  /** True when the last non-empty line is a question. */
  endsWithQuestion: boolean;
  powerWords: string[];
  fillerWords: string[];
  passiveHits: string[];
  firstLine: string;
  lineCount: number;
}

export interface AnalysisResult {
  platform: PlatformId;
  score: number;
  grade: string;
  metrics: Metrics;
  categories: CategoryScore[];
  suggestions: Suggestion[];
}
