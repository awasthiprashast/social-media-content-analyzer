import type { Metrics } from '../types';
import {
  CTA_PATTERNS, FILLER_WORDS, INTENSIFIERS, NEGATIVE_WORDS, NEGATORS,
  POSITIVE_WORDS, POWER_WORDS, SYLLABLE_EXCEPTIONS,
} from './lexicon';

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MENTION_RE = /@[\p{L}\p{N}_.]+/gu;
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+/gi;
/**
 * Pictographs, emoticons, transport, symbols and flags. Arrows (U+2190-21FF)
 * are deliberately excluded: writers use them as typographic bullets, not as
 * emoji. A trailing variation selector is absorbed into the match so a single
 * glyph such as a red heart is not counted twice.
 */
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}]\u{FE0F}?/gu;
/** Passive voice: a form of "to be" followed by a past participle. */
const PASSIVE_RE = /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+(?:ed|en))\b/gi;

const WORDS_READ_PER_MINUTE = 220;

function matchAll(text: string, re: RegExp): string[] {
  return text.match(re) ?? [];
}

export function splitWords(text: string): string[] {
  // Strip handles, tags and URLs first so they are counted as their own things
  // rather than inflating the word count.
  const stripped = text
    .replace(URL_RE, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(MENTION_RE, ' ');
  return stripped.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[\p{Lu}"'(\p{N}])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Vowel-group syllable estimate. Not perfect English phonology, but stable and
 * accurate enough for a readability index, which is itself an approximation.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (SYLLABLE_EXCEPTIONS[w]) return SYLLABLE_EXCEPTIONS[w];
  if (w.length <= 3) return 1;

  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch Reading Ease: higher is easier. ~60-70 is plain English. */
function fleschReadingEase(words: number, sentences: number, syllables: number): number {
  if (!words || !sentences) return 0;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return clamp(score, 0, 120);
}

/** Flesch-Kincaid grade level: roughly the US school grade needed to read it. */
function fleschKincaidGrade(words: number, sentences: number, syllables: number): number {
  if (!words || !sentences) return 0;
  const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  return clamp(grade, 0, 20);
}

/**
 * Lexicon sentiment normalised to -1..1, with negation flipping a hit and
 * intensifiers amplifying it. Simple, but it explains itself: the matched
 * words are returned so the UI can show why the score came out as it did.
 */
function scoreSentiment(words: string[]): {
  score: number;
  positives: string[];
  negatives: string[];
} {
  const positives: string[] = [];
  const negatives: string[] = [];
  let total = 0;

  words.forEach((raw, index) => {
    const word = raw.toLowerCase();
    const isPositive = POSITIVE_WORDS.includes(word);
    const isNegative = NEGATIVE_WORDS.includes(word);
    if (!isPositive && !isNegative) return;

    let value = isPositive ? 1 : -1;
    const previous = (words[index - 1] ?? '').toLowerCase();
    if (NEGATORS.includes(previous)) value *= -0.8;
    if (INTENSIFIERS.includes(previous)) value *= 1.5;

    total += value;
    (value > 0 ? positives : negatives).push(raw);
  });

  // Divide by a soft constant rather than word count so a long neutral post
  // does not wash out a genuinely strong signal.
  return { score: clamp(total / 6, -1, 1), positives, negatives };
}

function findFillers(lower: string): string[] {
  // Escapes are doubled: this is a template literal, so a single backslash
  // would be consumed before the RegExp constructor ever saw it.
  return FILLER_WORDS.filter((filler) =>
    new RegExp(`\\b${filler.replace(/ /g, '\\s+')}\\b`, 'i').test(lower),
  );
}

function findPowerWords(words: string[]): string[] {
  const lower = words.map((w) => w.toLowerCase());
  return POWER_WORDS.filter((p) => lower.includes(p));
}

function findCtas(text: string): string[] {
  return CTA_PATTERNS.map((re) => text.match(re)?.[0]?.trim())
    .filter((hit): hit is string => Boolean(hit));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeMetrics(text: string): Metrics {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const words = splitWords(trimmed);
  const sentences = splitSentences(trimmed);
  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const lines = trimmed.split('\n');

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const sentenceCount = Math.max(1, sentences.length);
  const sentiment = scoreSentiment(words);
  const ctaHits = findCtas(trimmed);
  // A closing question is a call to action even when it matches none of the
  // imperative CTA phrasings.
  const lastLine = [...lines].reverse().find((line) => line.trim()) ?? '';
  const endsWithQuestion = /\?\s*$/.test(lastLine.trim());

  return {
    characters: trimmed.length,
    charactersNoSpaces: trimmed.replace(/\s/g, '').length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgWordsPerSentence: words.length / sentenceCount,
    avgSyllablesPerWord: words.length ? syllables / words.length : 0,
    readingEase: fleschReadingEase(words.length, sentenceCount, syllables),
    gradeLevel: fleschKincaidGrade(words.length, sentenceCount, syllables),
    readingTimeSeconds: (words.length / WORDS_READ_PER_MINUTE) * 60,
    hashtags: matchAll(trimmed, HASHTAG_RE),
    mentions: matchAll(trimmed, MENTION_RE),
    links: matchAll(trimmed, URL_RE),
    emojis: matchAll(trimmed, EMOJI_RE),
    questions: (trimmed.match(/\?/g) ?? []).length,
    exclamations: (trimmed.match(/!/g) ?? []).length,
    allCapsWords: words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w)),
    longWords: words.filter((w) => countSyllables(w) >= 3).length,
    numbers: (trimmed.match(/\b\d[\d.,%]*\b/g) ?? []).length,
    sentiment: sentiment.score,
    positiveHits: sentiment.positives,
    negativeHits: sentiment.negatives,
    hasCta: ctaHits.length > 0 || endsWithQuestion,
    ctaHits,
    endsWithQuestion,
    powerWords: findPowerWords(words),
    fillerWords: findFillers(lower),
    passiveHits: matchAll(trimmed, PASSIVE_RE),
    firstLine: (lines.find((l) => l.trim()) ?? '').trim(),
    lineCount: lines.length,
  };
}
